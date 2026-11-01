import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { applyEnquiryFilters, enquirySort, fmtDate, loadFormOptions } from "@/lib/queries";
import { EMIRATES, SOURCES, STATUSES, STATUS_LABEL, label, type Status } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";
import MobileFilters from "@/components/MobileFilters";
import Icon from "@/components/Icon";

const PAGE_SIZE = 20;

type SP = Record<string, string | undefined>;
const DOT = { new: "new", contacted: "con", interested: "int", not_interested: "not", converted: "cnv" } as const;

export default async function Enquiries({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireUser();
  const isAdmin = profile.role === "admin";
  const [{ categories, members }, { data: countRows }] = await Promise.all([
    loadFormOptions(supabase),
    supabase.rpc("dashboard_counts"),
  ]);
  const counts = Object.fromEntries((countRows ?? []).map((c: { status: string; total: number }) => [c.status, Number(c.total)]));
  const allCount = Object.values(counts).reduce((a: number, b) => a + (b as number), 0);

  const page = Math.max(1, Number(sp.page) || 1);
  const { sort, asc } = enquirySort(sp);

  let q = supabase
    .from("vendor_enquiries")
    .select(
      "id, enquiry_code, business_name, branch_name, primary_phone, contact_person, area, emirate, status, next_follow_up_at, created_at, categories(name), subcategories(name), assigned:profiles!vendor_enquiries_assigned_to_fkey(full_name)",
      { count: "exact" },
    );

  q = applyEnquiryFilters(q, sp);

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

  const exportHref = `/enquiries/export?${new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][])}`;
  const tags: { label: string; href: string }[] = [];
  const addTag = (lbl: string | undefined, keys: string[]) => {
    if (lbl) tags.push({ label: lbl, href: link(Object.fromEntries([...keys, "page"].map((k) => [k, undefined]))) });
  };
  addTag(categories.find((c) => c.id === sp.category)?.name, ["category", "subcategory"]);
  addTag(subs.find((x) => x.id === sp.subcategory)?.name, ["subcategory"]);
  addTag(sp.emirate, ["emirate"]);
  addTag(sp.assigned === "none" ? "Unassigned" : members.find((m) => m.id === sp.assigned)?.full_name, ["assigned"]);
  addTag(sp.source ? label(sp.source) : undefined, ["source"]);
  addTag(sp.from || sp.to ? `${sp.from ?? "…"} → ${sp.to ?? "…"}` : undefined, ["from", "to"]);

  return (
    <div className="space-y-4">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h1>Vendor Enquiries</h1>
          <p className="hidden lg:block">Search, filter and open any business to see its history.</p>
        </div>
        <div className="hidden gap-2 lg:flex">
          {isAdmin && (
            <a href={exportHref} className="btn-secondary">
              <Icon name="download" className="h-[18px] w-[18px]" />
              Export to Excel
            </a>
          )}
          <Link href="/enquiries/new" className="btn">
            + Add enquiry
          </Link>
        </div>
      </div>

      <section className="pipe" aria-label="Status pipeline">
        <div className="pipe-top">
          <b>{allCount}</b>
          <span>
            {(sp.status ? `${STATUS_LABEL[sp.status as Status] ?? ""} · ` : "") + `${total} result${total === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="pbar" aria-hidden="true">
          {STATUSES.filter((s) => (counts[s] ?? 0) > 0).map((s) => (
            <i key={s} style={{ flex: counts[s], background: `var(--c-${DOT[s]})` }} />
          ))}
        </div>
        <div className="plegend">
          {[["", "All", allCount, "brand"], ...STATUSES.map((s) => [s, STATUS_LABEL[s], counts[s] ?? 0, DOT[s]])].map(([v, l, n, c]) => (
            <Link
              key={String(v)}
              href={link({ status: String(v) || undefined, page: undefined })}
              className="prow"
              aria-current={(sp.status ?? "") === v}
            >
              <span>
                <i className="pdot" style={{ background: c === "brand" ? "var(--brand)" : `var(--c-${c})` }} />
                {l}
              </span>
              <b>{n}</b>
            </Link>
          ))}
        </div>
      </section>

      <MobileFilters
        values={{ ...(sp as Record<string, string>), sort }}
        categories={categories.map((c) => ({ id: c.id, name: c.name, subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })) }))}
        members={members.map((m) => ({ value: m.id, label: m.full_name }))}
        emirates={[...EMIRATES]}
        sources={SOURCES.map((s) => ({ value: s, label: label(s) }))}
        tags={tags}
        resetHref={sp.status ? `/enquiries?status=${sp.status}` : "/enquiries"}
        total={total}
      />

      {isAdmin && (
        <a href={exportHref} className="btn-secondary fbig w-full lg:hidden">
          <Icon name="download" className="h-[18px] w-[18px]" />
          Export to Excel
        </a>
      )}

      <div className="hidden flex-wrap gap-1.5 lg:flex">
        {[["", "All"], ...STATUSES.map((s) => [s, STATUS_LABEL[s]])].map(([v, l]) => (
          <Link key={v} href={link({ status: v || undefined, page: undefined })} className="chip" aria-current={(sp.status ?? "") === v}>
            {l}
          </Link>
        ))}
      </div>

      <form className="card hidden grid-cols-2 gap-3 md:grid-cols-4 lg:grid" action="/enquiries">
        <input name="q" defaultValue={sp.q} placeholder="Search name, phone, contact, area, code…" className="input col-span-2" aria-label="Search" />
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
        <div className="col-span-2 flex gap-2 md:col-span-1">
          <button className="btn">Apply</button>
          <Link href="/enquiries" className="btn-secondary">Reset</Link>
        </div>
      </form>

      {error && <p role="alert" className="text-sm text-rose-600">Could not load enquiries: {error.message}</p>}

      <div className="space-y-2.5 lg:hidden">
        {(data ?? []).map((r: any) => (
          <Link key={r.id} href={`/enquiries/${r.id}`} className="ecard">
            <div className="min-w-0">
              <b className="truncate">
                {r.business_name}
                {r.branch_name ? ` — ${r.branch_name}` : ""}
              </b>
              <small>{r.enquiry_code} · {r.categories?.name}</small>
              <small>{[r.area, r.emirate].filter(Boolean).join(", ") || "No location"} · {r.primary_phone}</small>
              {r.next_follow_up_at && <small>Next follow-up {fmtDate(r.next_follow_up_at)}</small>}
            </div>
            <StatusBadge status={r.status as Status} />
          </Link>
        ))}
        {!data?.length && (
          <p className="py-10 text-center text-sm text-slate-500">
            {Object.values(sp).some(Boolean) ? "No enquiries match these filters." : "No enquiries yet. Tap + to record your first vendor."}
          </p>
        )}
      </div>

      <div className="card hidden overflow-x-auto p-0 lg:block">
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>{total} result{total === 1 ? "" : "s"}</span>
        <div className="flex flex-wrap items-center gap-3">
          {page > 1 && <Link href={link({ page: String(page - 1) })} className="btn-secondary min-h-11">Previous</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link href={link({ page: String(page + 1) })} className="btn-secondary min-h-11">Next</Link>}
        </div>
      </div>
    </div>
  );
}
