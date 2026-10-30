import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { fmtDate, loadFormOptions } from "@/lib/queries";
import { EMIRATES, SOURCES, STATUSES, STATUS_LABEL, label, type Status } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";

const PAGE_SIZE = 20;
const SORTS: Record<string, string> = {
  created_at: "created_at",
  updated_at: "updated_at",
  next_follow_up_at: "next_follow_up_at",
  business_name: "business_name",
};

type SP = Record<string, string | undefined>;

export default async function Enquiries({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const { categories, members } = await loadFormOptions(supabase);

  const page = Math.max(1, Number(sp.page) || 1);
  const sort = SORTS[sp.sort ?? ""] ?? "created_at";
  const asc = sp.dir === "asc";

  let q = supabase
    .from("vendor_enquiries")
    .select(
      "id, enquiry_code, business_name, branch_name, primary_phone, contact_person, area, emirate, status, next_follow_up_at, created_at, categories(name), subcategories(name), assigned:profiles!vendor_enquiries_assigned_to_fkey(full_name)",
      { count: "exact" },
    );

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

  const { data, count, error } = await q
    .order(sort, { ascending: asc, nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const subs = categories.find((c) => c.id === sp.category)?.subcategories ?? [];
  const link = (over: SP) => {
    const p = new URLSearchParams();
    Object.entries({ ...sp, ...over }).forEach(([k, v]) => v && p.set(k, v));
    return `/enquiries?${p}`;
  };

  return (
    <div className="space-y-4">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Vendor Enquiries</h1>
          <p>Search, filter and open any business to see its history.</p>
        </div>
        <Link href="/enquiries/new" className="btn">
          + Add enquiry
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[["", "All"], ...STATUSES.map((s) => [s, STATUS_LABEL[s]])].map(([v, l]) => (
          <Link key={v} href={link({ status: v || undefined, page: undefined })} className="chip" aria-current={(sp.status ?? "") === v}>
            {l}
          </Link>
        ))}
      </div>

      <form className="card grid gap-3 md:grid-cols-4" action="/enquiries">
        <input name="q" defaultValue={sp.q} placeholder="Search name, phone, contact, area, code…" className="input md:col-span-2" aria-label="Search" />
        <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select name="category" defaultValue={sp.category ?? ""} className="input" aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select name="subcategory" defaultValue={sp.subcategory ?? ""} className="input" aria-label="Subcategory">
          <option value="">{sp.category ? "All subcategories" : "Subcategory (pick category, apply)"}</option>
          {subs.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select name="emirate" defaultValue={sp.emirate ?? ""} className="input" aria-label="Emirate">
          <option value="">All emirates</option>
          {EMIRATES.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <select name="assigned" defaultValue={sp.assigned ?? ""} className="input" aria-label="Assigned to">
          <option value="">Anyone</option>
          <option value="none">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
        <select name="source" defaultValue={sp.source ?? ""} className="input" aria-label="Source">
          <option value="">All sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{label(s)}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={sp.from} className="input" aria-label="Created from" />
        <input type="date" name="to" defaultValue={sp.to} className="input" aria-label="Created to" />
        <select name="sort" defaultValue={sort} className="input" aria-label="Sort by">
          <option value="created_at">Sort: Created</option>
          <option value="updated_at">Sort: Updated</option>
          <option value="next_follow_up_at">Sort: Next follow-up</option>
          <option value="business_name">Sort: Business name</option>
        </select>
        <select name="dir" defaultValue={asc ? "asc" : "desc"} className="input" aria-label="Direction">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        <div className="flex gap-2">
          <button className="btn">Apply</button>
          <Link href="/enquiries" className="btn-secondary">Reset</Link>
        </div>
      </form>

      {error && <p role="alert" className="text-sm text-rose-600">Could not load enquiries: {error.message}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[760px]">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Business</th>
              <th className="th">Category</th>
              <th className="th">Contact</th>
              <th className="th">Area</th>
              <th className="th">Status</th>
              <th className="th">Assigned</th>
              <th className="th">Next follow-up</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="td">
                  <Link href={`/enquiries/${r.id}`} className="font-medium text-violet-700 hover:underline">
                    {r.business_name}
                    {r.branch_name ? ` — ${r.branch_name}` : ""}
                  </Link>
                  <div className="text-xs text-slate-500">{r.enquiry_code}</div>
                </td>
                <td className="td">
                  {r.categories?.name}
                  <div className="text-xs text-slate-500">{r.subcategories?.name}</div>
                </td>
                <td className="td">
                  {r.contact_person ?? "—"}
                  <div className="text-xs text-slate-500">{r.primary_phone}</div>
                </td>
                <td className="td">{[r.area, r.emirate].filter(Boolean).join(", ") || "—"}</td>
                <td className="td"><StatusBadge status={r.status as Status} /></td>
                <td className="td">{r.assigned?.full_name ?? "—"}</td>
                <td className="td whitespace-nowrap">{fmtDate(r.next_follow_up_at)}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={7} className="td py-10 text-center text-slate-500">
                  {Object.values(sp).some(Boolean)
                    ? "No enquiries match these filters."
                    : "No enquiries yet. Click “Add enquiry” to record your first vendor."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{total} result{total === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-3">
          {page > 1 && <Link href={link({ page: String(page - 1) })} className="btn-secondary">Previous</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link href={link({ page: String(page + 1) })} className="btn-secondary">Next</Link>}
        </div>
      </div>
    </div>
  );
}
