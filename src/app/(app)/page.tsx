import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { fmtDate, todayUAE, type EnquiryListRow } from "@/lib/queries";
import { STATUSES, STATUS_LABEL, type Status } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";

const DOT = { new: "new", contacted: "con", interested: "int", not_interested: "not", converted: "cnv" } as const;

export default async function Dashboard() {
  const { supabase, profile } = await requireUser();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", hour: "numeric", hour12: false }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = todayUAE();

  const [{ data: counts }, { data: recent }, { data: due }] = await Promise.all([
    supabase.rpc("dashboard_counts"),
    supabase
      .from("vendor_enquiries")
      .select("id, enquiry_code, business_name, area, status, created_at, categories(name), assigned:profiles!vendor_enquiries_assigned_to_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("vendor_enquiries")
      .select("id, enquiry_code, business_name, status, next_follow_up_at")
      .lte("next_follow_up_at", today)
      .not("status", "in", "(converted,not_interested)")
      .order("next_follow_up_at")
      .limit(10),
  ]);

  const byStatus = Object.fromEntries((counts ?? []).map((c: { status: string; total: number }) => [c.status, Number(c.total)]));
  const total = Object.values(byStatus).reduce((a: number, b) => a + (b as number), 0);

  return (
    <div className="space-y-6">
      <div className="page-head">
        <div>
          <h1>{greeting}, {profile.full_name.split(" ")[0] || "there"}</h1>
          <p>Here is where the vendor pipeline stands today.</p>
        </div>
        <Link href="/enquiries/new" className="btn">
          + Add enquiry
        </Link>
      </div>

      <div className="stats">
        <div className="stat hero">
          <span>Total enquiries</span>
          <b>{total}</b>
        </div>
        {STATUSES.map((s) => (
          <Link key={s} href={`/enquiries?status=${s}`} className="stat">
            <span>
              <i className="dot" style={{ background: `var(--s-${DOT[s]}-fg)` }} />
              {STATUS_LABEL[s]}
            </span>
            <b>{byStatus[s] ?? 0}</b>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card min-w-0 xl:col-span-2">
          <h2 className="mb-3 font-semibold">Recent enquiries</h2>
          {recent?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th className="th">Business</th>
                    <th className="th">Category</th>
                    <th className="th">Area</th>
                    <th className="th">Status</th>
                    <th className="th">Assigned</th>
                    <th className="th">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(recent as unknown as EnquiryListRow[]).map((r) => (
                    <tr key={r.id}>
                      <td className="td">
                        <Link href={`/enquiries/${r.id}`} className="font-medium text-violet-700 hover:underline">
                          {r.business_name}
                        </Link>
                        <div className="text-xs text-slate-500">{r.enquiry_code}</div>
                      </td>
                      <td className="td">{r.categories?.name}</td>
                      <td className="td">{r.area ?? "—"}</td>
                      <td className="td">
                        <StatusBadge status={r.status as Status} />
                      </td>
                      <td className="td">{r.assigned?.full_name ?? "—"}</td>
                      <td className="td whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No enquiries yet. <Link href="/enquiries/new" className="text-violet-700 underline">Add your first vendor enquiry</Link> after a call, visit or WhatsApp chat.
            </p>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold">Follow-ups due</h2>
          {due?.length ? (
            <ul className="space-y-2">
              {due.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/enquiries/${d.id}`} className="truncate text-violet-700 hover:underline">
                    {d.business_name}
                  </Link>
                  <span className={d.next_follow_up_at! < today ? "text-rose-600" : "text-slate-600"}>
                    {d.next_follow_up_at! < today ? "Overdue · " : "Today · "}
                    {fmtDate(d.next_follow_up_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nothing due today or overdue.</p>
          )}
          <Link href="/follow-ups" className="mt-3 inline-block text-sm text-violet-700 hover:underline">
            All follow-ups →
          </Link>
        </section>
      </div>
    </div>
  );
}
