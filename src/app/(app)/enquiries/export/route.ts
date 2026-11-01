import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/auth";
import { label, STATUS_LABEL, type Status } from "@/lib/constants";
import { applyEnquiryFilters, enquirySort, todayUAE, type EnquirySP } from "@/lib/queries";

// Admin-only: the download is authorised here, not just hidden in the UI. Rows are read with the
// admin's own session, so RLS still applies.
const CHUNK = 1000;
const UAE_OFFSET_MS = 4 * 3600 * 1000;

// Excel stores dates without a time zone, so shift to UAE wall-clock time before writing.
const uaeDateTime = (s: string | null) => (s ? new Date(new Date(s).getTime() + UAE_OFFSET_MS) : null);
const dateOnly = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function GET(request: Request) {
  const { supabase } = await requireAdmin();
  const sp: EnquirySP = Object.fromEntries(new URL(request.url).searchParams);
  const { sort, asc } = enquirySort(sp);

  const enquiries: Row[] = [];
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await applyEnquiryFilters(
      supabase
        .from("vendor_enquiries")
        .select(
          "*, categories(name), subcategories(name), assigned:profiles!vendor_enquiries_assigned_to_fkey(full_name), creator:profiles!vendor_enquiries_created_by_fkey(full_name)",
        ),
      sp,
    )
      .order(sort, { ascending: asc, nullsFirst: false })
      .order("id")
      .range(from, from + CHUNK - 1);
    if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });
    enquiries.push(...(data ?? []));
    if ((data?.length ?? 0) < CHUNK) break;
  }

  const byId = new Map(enquiries.map((e) => [e.id as string, e]));
  const followUps: Row[] = [];
  const ids = [...byId.keys()];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase
      .from("follow_ups")
      .select("*, author:profiles!follow_ups_created_by_fkey(full_name)")
      .in("enquiry_id", ids.slice(i, i + 200))
      .order("activity_at", { ascending: false });
    followUps.push(...(data ?? []));
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Ozfero Vendor Desk";
  wb.created = new Date();

  const sheet = (name: string, cols: [string, number][]) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = cols.map(([header, width]) => ({ header, width }));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F8F0F" } };
    head.alignment = { vertical: "middle" };
    head.height = 22;
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    return ws;
  };

  const ws = sheet("Enquiries", [
    ["Code", 16], ["Business", 28], ["Branch", 18], ["Category", 22], ["Subcategory", 20],
    ["Contact person", 20], ["Designation", 16], ["Primary phone", 18], ["Alternative phone", 18],
    ["WhatsApp", 18], ["Email", 26], ["Emirate", 14], ["Area", 16], ["Address", 30],
    ["Maps link", 26], ["Website", 26], ["Social", 26], ["Products / services", 30],
    ["Source", 12], ["Status", 15], ["Assigned to", 18], ["Interest notes", 36],
    ["Next follow-up", 14], ["Created by", 18], ["Created at", 18], ["Updated at", 18],
  ]);
  for (const e of enquiries) {
    ws.addRow([
      e.enquiry_code, e.business_name, e.branch_name, e.categories?.name, e.subcategories?.name,
      e.contact_person, e.designation, e.primary_phone, e.alternative_phone,
      e.whatsapp_number, e.email, e.emirate, e.area, e.full_address,
      e.maps_url, e.website_url, e.social_url, e.business_description,
      e.source ? label(e.source) : null, STATUS_LABEL[e.status as Status] ?? e.status,
      e.assigned?.full_name, e.interest_notes,
      dateOnly(e.next_follow_up_at), e.creator?.full_name,
      uaeDateTime(e.created_at), uaeDateTime(e.updated_at),
    ]);
  }
  ws.getColumn(23).numFmt = "dd-mmm-yyyy";
  ws.getColumn(25).numFmt = "dd-mmm-yyyy hh:mm";
  ws.getColumn(26).numFmt = "dd-mmm-yyyy hh:mm";

  const fs = sheet("Follow-ups", [
    ["Code", 16], ["Business", 28], ["Date and time", 18], ["Method", 12],
    ["Outcome", 36], ["Notes", 44], ["Next follow-up", 14], ["Logged by", 18],
  ]);
  for (const f of followUps) {
    const e = byId.get(f.enquiry_id);
    fs.addRow([
      e?.enquiry_code, e?.business_name, uaeDateTime(f.activity_at), label(f.activity_type),
      f.outcome, f.notes, dateOnly(f.next_follow_up_at), f.author?.full_name,
    ]);
  }
  fs.getColumn(3).numFmt = "dd-mmm-yyyy hh:mm";
  fs.getColumn(7).numFmt = "dd-mmm-yyyy";

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ozfero-enquiries-${todayUAE()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
