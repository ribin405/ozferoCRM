import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/queries";
import { label, type Status } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";
import FollowUpForm from "@/components/FollowUpForm";
import DeleteEnquiryButton from "@/components/DeleteEnquiryButton";
import Icon from "@/components/Icon";

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const [{ data: e }, { data: fus }] = await Promise.all([
    supabase
      .from("vendor_enquiries")
      .select(
        "*, categories(name), subcategories(name), assigned:profiles!vendor_enquiries_assigned_to_fkey(full_name), creator:profiles!vendor_enquiries_created_by_fkey(full_name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("follow_ups")
      .select("*, author:profiles!follow_ups_created_by_fkey(full_name)")
      .eq("enquiry_id", id)
      .order("activity_at", { ascending: false }),
  ]);
  if (!e) notFound();

  const rows: [string, React.ReactNode][] = [
    ["Category", `${e.categories?.name} › ${e.subcategories?.name}`],
    ["Contact person", [e.contact_person, e.designation].filter(Boolean).join(", ") || "—"],
    ["Primary phone", e.primary_phone],
    ["Alternative phone", e.alternative_phone ?? "—"],
    ["WhatsApp", e.whatsapp_number ?? "—"],
    ["Email", e.email ?? "—"],
    ["Location", [e.area, e.emirate].filter(Boolean).join(", ") || "—"],
    ["Address", e.full_address ?? "—"],
    ["Maps", e.maps_url ? <a key="m" className="text-violet-700 underline" href={e.maps_url} target="_blank" rel="noopener noreferrer">Open map</a> : "—"],
    ["Website", e.website_url ? <a key="w" className="text-violet-700 underline" href={e.website_url} target="_blank" rel="noopener noreferrer">{e.website_url}</a> : "—"],
    ["Social", e.social_url ? <a key="s" className="text-violet-700 underline" href={e.social_url} target="_blank" rel="noopener noreferrer">{e.social_url}</a> : "—"],
    ["Offers", e.business_description ?? "—"],
    ["Source", e.source ? label(e.source) : "—"],
    ["Assigned to", e.assigned?.full_name ?? "Unassigned"],
    ["Next follow-up", fmtDate(e.next_follow_up_at)],
    ["Created", `${fmtDateTime(e.created_at)} by ${e.creator?.full_name ?? "—"}`],
    ["Last updated", fmtDateTime(e.updated_at)],
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/enquiries" className="text-sm text-slate-500 hover:underline">← All enquiries</Link>
          <h1 className="text-2xl font-semibold">
            {e.business_name}
            {e.branch_name ? ` — ${e.branch_name}` : ""}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {e.enquiry_code} <StatusBadge status={e.status as Status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/enquiries/${id}/edit`} className="act">
            <Icon name="edit" className="h-[18px] w-[18px]" />
            Edit
          </Link>
          {profile.role === "admin" && <DeleteEnquiryButton id={id} name={e.business_name} redirectTo="/enquiries" />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">Details</h2>
          <dl className="space-y-2 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="break-words">{v}</dd>
              </div>
            ))}
          </dl>
          {e.interest_notes && (
            <div className="mt-4 border-t pt-3 text-sm">
              <div className="mb-1 text-slate-500">Interest / discussion notes</div>
              <p className="whitespace-pre-wrap">{e.interest_notes}</p>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 font-semibold">Log a follow-up</h2>
            <FollowUpForm enquiryId={id} currentStatus={e.status} />
          </section>
          <section className="card">
            <h2 className="mb-3 font-semibold">Activity timeline</h2>
            {fus?.length ? (
              <ol className="space-y-4 border-l pl-4">
                {fus.map((f: any) => (
                  <li key={f.id} className="text-sm">
                    <div className="font-medium">
                      {label(f.activity_type)} · {fmtDateTime(f.activity_at)}
                    </div>
                    {f.outcome && <div>{f.outcome}</div>}
                    {f.notes && <p className="whitespace-pre-wrap text-slate-600">{f.notes}</p>}
                    <div className="text-xs text-slate-500">
                      by {f.author?.full_name ?? "—"}
                      {f.next_follow_up_at ? ` · next follow-up ${fmtDate(f.next_follow_up_at)}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">No activity logged yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
