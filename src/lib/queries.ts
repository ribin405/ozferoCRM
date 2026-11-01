import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadFormOptions(supabase: SupabaseClient) {
  const [{ data: cats }, { data: members }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, is_active, display_order, subcategories(id, name, is_active, display_order)")
      .order("display_order"),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);
  const categories = (cats ?? []).map((c) => ({
    ...c,
    subcategories: [...(c.subcategories ?? [])].sort((a, b) => a.display_order - b.display_order),
  }));
  return { categories, members: members ?? [] };
}

/** Today's date (YYYY-MM-DD) in the UAE, where the team works. */
export function todayUAE() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());
}

export const fmtDate = (d: string | null) =>
  d
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium" }).format(new Date(d))
    : "—";

export const fmtDateTime = (d: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "short" }).format(
    new Date(d),
  );

export type EnquirySP = Record<string, string | undefined>;

const ENQUIRY_SORTS = new Set(["created_at", "updated_at", "next_follow_up_at", "business_name"]);

export function enquirySort(sp: EnquirySP) {
  return { sort: ENQUIRY_SORTS.has(sp.sort ?? "") ? (sp.sort as string) : "created_at", asc: sp.dir === "asc" };
}

/** Applies the Vendor Enquiries list filters to a PostgREST query. Shared by the list page and the Excel export. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyEnquiryFilters<T>(query: T, sp: EnquirySP): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = query;
  if (sp.q?.trim()) {
    // Strip characters with meaning in PostgREST filter syntax.
    const t = sp.q.trim().replace(/[,()%*\\]/g, " ");
    q = q.or(
      `business_name.ilike.%${t}%,primary_phone.ilike.%${t}%,contact_person.ilike.%${t}%,area.ilike.%${t}%,enquiry_code.ilike.%${t}%`,
    );
  }
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.category) q = q.eq("category_id", sp.category);
  if (sp.subcategory) q = q.eq("subcategory_id", sp.subcategory);
  if (sp.emirate) q = q.eq("emirate", sp.emirate);
  if (sp.assigned) q = sp.assigned === "none" ? q.is("assigned_to", null) : q.eq("assigned_to", sp.assigned);
  if (sp.source) q = q.eq("source", sp.source);
  if (sp.from) q = q.gte("created_at", `${sp.from}T00:00:00+04:00`);
  if (sp.to) q = q.lte("created_at", `${sp.to}T23:59:59+04:00`);
  return q as T;
}
