"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

type Cat = { id: string; name: string; subcategories: { id: string; name: string }[] };
type Opt = { value: string; label: string };

/** Phone and tablet only (hidden from lg up): search + Filters button, bottom sheet, removable tags. */
export default function MobileFilters({
  values,
  categories,
  members,
  emirates,
  sources,
  tags,
  resetHref,
  total,
}: {
  values: Record<string, string>;
  categories: Cat[];
  members: Opt[];
  emirates: string[];
  sources: Opt[];
  tags: { label: string; href: string }[];
  resetHref: string;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const [catId, setCatId] = useState(values.category ?? "");
  const subs = categories.find((c) => c.id === catId)?.subcategories ?? [];

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <form action="/enquiries" className="space-y-3 lg:hidden">
      {values.status && <input type="hidden" name="status" value={values.status} />}

      <div className="fsearch">
        <input
          name="q"
          type="search"
          defaultValue={values.q}
          placeholder="Search name, phone, area, code"
          className="input fld"
          aria-label="Search"
          enterKeyHint="search"
        />
        <button type="button" className="fbtn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
          <Icon name="filter" className="h-[18px] w-[18px]" />
          Filters
          {tags.length > 0 && <em>{tags.length}</em>}
        </button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link key={t.label} href={t.href} className="ftag" aria-label={`Remove filter ${t.label}`}>
              {t.label}
              <span aria-hidden="true">✕</span>
            </Link>
          ))}
          <Link href={resetHref} className="fclear">
            Clear all
          </Link>
        </div>
      )}

      <div className="mscrim fscrim" data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="msheet fsheet" data-open={open} role="dialog" aria-label="Filters" aria-hidden={!open} inert={!open}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="!mb-0 text-lg">Filters</h2>
          <button type="button" className="fclose" onClick={() => setOpen(false)} aria-label="Close filters">
            ✕
          </button>
        </div>

        <div className="fgrid">
          <div className="col-span-2">
            <label className="label" htmlFor="m_category">Category</label>
            <select id="m_category" name="category" className="input fld" value={catId} onChange={(e) => setCatId(e.target.value)}>
              <option value="">Any category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="m_subcategory">Subcategory</label>
            <select
              id="m_subcategory"
              name="subcategory"
              key={catId}
              className="input fld"
              defaultValue={catId === (values.category ?? "") ? values.subcategory ?? "" : ""}
              disabled={!catId}
            >
              <option value="">{catId ? "Any subcategory" : "Choose a category first"}</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="m_emirate">Emirate</label>
            <select id="m_emirate" name="emirate" className="input fld" defaultValue={values.emirate ?? ""}>
              <option value="">Any</option>
              {emirates.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="m_assigned">Assigned to</label>
            <select id="m_assigned" name="assigned" className="input fld" defaultValue={values.assigned ?? ""}>
              <option value="">Anyone</option>
              <option value="none">Unassigned</option>
              {members.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="m_source">Source</label>
            <select id="m_source" name="source" className="input fld" defaultValue={values.source ?? ""}>
              <option value="">Any</option>
              {sources.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="m_sort">Sort by</label>
            <select id="m_sort" name="sort" className="input fld" defaultValue={values.sort ?? "created_at"}>
              <option value="created_at">Created</option>
              <option value="updated_at">Updated</option>
              <option value="next_follow_up_at">Next follow-up</option>
              <option value="business_name">Business name</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="m_from">Created from</label>
            <input id="m_from" type="date" name="from" defaultValue={values.from} className="input fld" />
          </div>
          <div>
            <label className="label" htmlFor="m_to">Created to</label>
            <input id="m_to" type="date" name="to" defaultValue={values.to} className="input fld" />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="m_dir">Order</label>
            <select id="m_dir" name="dir" className="input fld" defaultValue={values.dir === "asc" ? "asc" : "desc"}>
              <option value="desc">Newest or highest first</option>
              <option value="asc">Oldest or lowest first</option>
            </select>
          </div>
        </div>

        <div className="ffoot">
          <Link href={resetHref} className="btn-secondary fbig" onClick={() => setOpen(false)}>
            Reset
          </Link>
          <button className="btn fbig flex-1" onClick={() => setOpen(false)}>
            Show results
          </button>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">{total} results</span>
    </form>
  );
}
