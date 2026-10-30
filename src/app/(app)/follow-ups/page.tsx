import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { fmtDate, todayUAE } from "@/lib/queries";
import { type Status } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";

type Row = {
  id: string;
  enquiry_code: string;
  business_name: string;
  primary_phone: string;
  status: Status;
  next_follow_up_at: string;
  assigned: { full_name: string } | null;
};

export default async function FollowUps() {
  const { supabase } = await requireUser();
  const today = todayUAE();
  const { data } = await supabase
    .from("vendor_enquiries")
    .select("id, enquiry_code, business_name, primary_phone, status, next_follow_up_at, assigned:profiles!vendor_enquiries_assigned_to_fkey(full_name)")
    .not("next_follow_up_at", "is", null)
    .not("status", "in", "(converted,not_interested)")
    .order("next_follow_up_at")
    .limit(500)
    .returns<Row[]>();

  const rows = data ?? [];
  const groups = [
    { title: "Overdue", tone: "text-rose-600", items: rows.filter((r) => r.next_follow_up_at < today) },
    { title: "Due today", tone: "text-amber-700", items: rows.filter((r) => r.next_follow_up_at === today) },
    { title: "Upcoming", tone: "text-slate-700", items: rows.filter((r) => r.next_follow_up_at > today) },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Follow-ups</h1>
      {groups.map((g) => (
        <section key={g.title} className="card">
          <h2 className={`mb-3 font-semibold ${g.tone}`}>
            {g.title} ({g.items.length})
          </h2>
          {g.items.length ? (
            <ul className="divide-y">
              {g.items.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <Link href={`/enquiries/${r.id}`} className="font-medium text-violet-700 hover:underline">
                      {r.business_name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {r.enquiry_code} · {r.primary_phone} · {r.assigned?.full_name ?? "Unassigned"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <span className="whitespace-nowrap">{fmtDate(r.next_follow_up_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">None.</p>
          )}
        </section>
      ))}
    </div>
  );
}
