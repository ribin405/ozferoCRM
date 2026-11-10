"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { saveEnquiry, checkDuplicates, type FormState } from "@/app/(app)/enquiries/actions";
import { EMIRATES, SOURCES, STATUSES, STATUS_LABEL, label, type Status } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";

type Cat = {
  id: string;
  name: string;
  is_active: boolean;
  subcategories: { id: string; name: string; is_active: boolean }[];
};
type Member = { id: string; full_name: string };
type Values = Record<string, string | null | undefined>;
type Dup = Awaited<ReturnType<typeof checkDuplicates>>;

export default function EnquiryForm({
  id,
  categories,
  members,
  values = {},
  currentUserId,
  enquiryDate,
  today,
}: {
  id: string | null;
  categories: Cat[];
  members: Member[];
  values?: Values;
  currentUserId: string;
  enquiryDate: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(saveEnquiry.bind(null, id), undefined as FormState);
  const [dirty, setDirty] = useState(false);
  const [catId, setCatId] = useState(values.category_id ?? "");
  const [name, setName] = useState(values.business_name ?? "");
  const [phone, setPhone] = useState(values.primary_phone ?? "");
  const [dups, setDups] = useState<Dup>([]);
  const err = state?.errors ?? {};
  // Fields the browser refused to submit (required or badly formatted). Shown next to the button so a
  // phone user who is looking at the bottom of the form always sees why nothing was saved.
  const [invalid, setInvalid] = useState<string[]>([]);
  const serverProblems = Object.entries(err).map(([k, m]) => `${label(k)}: ${m}`);
  const v = (k: string) => values[k] ?? "";
  const subs = categories.find((c) => c.id === catId)?.subcategories ?? [];

  // Warn before discarding unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Debounced duplicate lookup (warn, never block).
  const seq = useRef(0);
  useEffect(() => {
    const n = ++seq.current;
    const t = setTimeout(async () => {
      const res =
        name.trim().length >= 3 || phone.trim().length >= 6 ? await checkDuplicates(name, phone, id) : [];
      if (n === seq.current) setDups(res);
    }, 400);
    return () => clearTimeout(t);
  }, [name, phone, id]);

  const field = (k: string, lbl: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={k}>
        {lbl}
      </label>
      <input id={k} name={k} defaultValue={v(k)} className="input" {...props} />
      {err[k] && <p className="mt-1 text-xs text-rose-600">{err[k]}</p>}
    </div>
  );

  return (
    <form
      action={action}
      onChange={() => setDirty(true)}
      onSubmit={() => setDirty(false)}
      onInvalidCapture={(e) => {
        const el = e.target as HTMLInputElement;
        const name = el.labels?.[0]?.textContent?.replace("*", "").trim() || el.name;
        setInvalid((prev) => (prev.includes(name) ? prev : [...prev, name]));
      }}
      className="space-y-6"
    >
      {state?.message && (
        <p role="alert" className="rounded bg-rose-50 p-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      {dups.length > 0 && (
        <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="mb-2 font-medium text-amber-900">
            Possible duplicate{dups.length > 1 ? "s" : ""} found. Review before saving:
          </p>
          <ul className="space-y-1">
            {dups.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-amber-200 px-1.5 text-xs">
                  {d.match_type === "phone" ? "Same phone" : "Similar name"}
                </span>
                <Link href={`/enquiries/${d.id}`} target="_blank" className="font-medium text-violet-700 hover:underline">
                  {d.business_name}
                  {d.branch_name ? ` — ${d.branch_name}` : ""}
                </Link>
                <span className="text-slate-600">
                  {d.enquiry_code} · {d.area ?? "no area"} · {d.primary_phone} · {d.assigned_name ?? "unassigned"}
                </span>
                <StatusBadge status={d.status as Status} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-600">You can still save this as a separate record (e.g. another branch).</p>
        </div>
      )}

      <section className="card grid gap-4 md:grid-cols-2">
        <h2 className="col-span-full font-semibold">Business</h2>
        <div>
          <label className="label" htmlFor="business_name">
            Business name *
          </label>
          <input
            id="business_name"
            name="business_name"
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {err.business_name && <p className="mt-1 text-xs text-rose-600">{err.business_name}</p>}
        </div>
        {field("branch_name", "Branch name / label")}
        <div>
          <label className="label" htmlFor="category_id">
            Category *
          </label>
          <select
            id="category_id"
            name="category_id"
            className="input"
            required
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
          >
            <option value="">Select…</option>
            {categories
              .filter((c) => c.is_active || c.id === values.category_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          {err.category_id && <p className="mt-1 text-xs text-rose-600">{err.category_id}</p>}
        </div>
        <div>
          <label className="label" htmlFor="subcategory_id">
            Subcategory *
          </label>
          <select
            id="subcategory_id"
            name="subcategory_id"
            key={catId}
            className="input"
            required
            defaultValue={catId === values.category_id ? v("subcategory_id") : ""}
            disabled={!catId}
          >
            <option value="">{catId ? "Select…" : "Select a category first"}</option>
            {subs
              .filter((s) => s.is_active || s.id === values.subcategory_id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          {err.subcategory_id && <p className="mt-1 text-xs text-rose-600">{err.subcategory_id}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="business_description">
            Products / services offered
          </label>
          <textarea
            id="business_description"
            name="business_description"
            rows={2}
            defaultValue={v("business_description")}
            className="input"
          />
        </div>
      </section>

      <section className="card grid gap-4 md:grid-cols-2">
        <h2 className="col-span-full font-semibold">Contact</h2>
        {field("contact_person", "Contact person")}
        {field("designation", "Designation")}
        <div>
          <label className="label" htmlFor="primary_phone">
            Primary phone *
          </label>
          <input
            id="primary_phone"
            name="primary_phone"
            type="tel"
            className="input"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+971 50 123 4567"
          />
          {err.primary_phone && <p className="mt-1 text-xs text-rose-600">{err.primary_phone}</p>}
        </div>
        {field("alternative_phone", "Alternative phone", { type: "tel" })}
        {field("whatsapp_number", "WhatsApp number", { type: "tel" })}
        {field("email", "Email", { type: "email" })}
      </section>

      <section className="card grid gap-4 md:grid-cols-2">
        <h2 className="col-span-full font-semibold">Location & online</h2>
        <div>
          <label className="label" htmlFor="emirate">
            Emirate
          </label>
          <select id="emirate" name="emirate" className="input" defaultValue={v("emirate")}>
            <option value="">—</option>
            {EMIRATES.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </div>
        {field("area", "City / area")}
        <div className="md:col-span-2">{field("full_address", "Full address")}</div>
        {field("maps_url", "Google Maps link", { type: "url", placeholder: "https://" })}
        {field("website_url", "Website", { type: "url", placeholder: "https://" })}
        {field("social_url", "Social profile", { type: "url", placeholder: "https://" })}
      </section>

      <section className="card grid gap-4 md:grid-cols-2">
        <h2 className="col-span-full font-semibold">Pipeline</h2>
        <div>
          <label className="label" htmlFor="source">
            Enquiry source
          </label>
          <select id="source" name="source" className="input" defaultValue={v("source")}>
            <option value="">—</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="input" defaultValue={v("status") || "new"}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="assigned_to">
            Assigned to
          </label>
          <select
            id="assigned_to"
            name="assigned_to"
            className="input"
            defaultValue={id ? v("assigned_to") : currentUserId}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="enquiry_date">
            Enquiry date
          </label>
          <input id="enquiry_date" name="enquiry_date" type="date" defaultValue={enquiryDate} max={today} className="input" />
          {err.enquiry_date && <p className="mt-1 text-xs text-rose-600">{err.enquiry_date}</p>}
          <p className="mt-1 text-xs text-slate-500">The day the vendor was contacted. Change it if you are recording this later.</p>
        </div>
        {field("next_follow_up_at", "Next follow-up date", { type: "date" })}
        <div className="md:col-span-2">
          <label className="label" htmlFor="interest_notes">
            Interest / discussion notes
          </label>
          <textarea id="interest_notes" name="interest_notes" rows={3} defaultValue={v("interest_notes")} className="input" />
        </div>
      </section>

      {(invalid.length > 0 || serverProblems.length > 0) && (
        <div role="alert" className="form-alert">
          <b>Not saved yet. Please fix:</b>
          <ul>
            {(serverProblems.length > 0 ? serverProblems : invalid).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {state?.message && !state.errors && (
        <p role="alert" className="form-alert">
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <button className="btn" disabled={pending} onClick={() => setInvalid([])}>
          {pending ? "Saving…" : id ? "Save changes" : "Create enquiry"}
        </button>
        <Link
          href={id ? `/enquiries/${id}` : "/enquiries"}
          className="btn-secondary"
          onClick={(e) => {
            if (dirty && !confirm("Discard unsaved changes?")) e.preventDefault();
          }}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
