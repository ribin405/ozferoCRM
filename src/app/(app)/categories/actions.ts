"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

// RLS also restricts these writes to admins; requireAdmin gives a clean failure first.
type Table = "categories" | "subcategories";
const done = () => revalidatePath("/categories");

export async function addCategory(fd: FormData) {
  const { supabase } = await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;
  const { data: last } = await supabase
    .from("categories").select("display_order").order("display_order", { ascending: false }).limit(1);
  await supabase.from("categories").insert({ name, display_order: (last?.[0]?.display_order ?? 0) + 10 });
  done();
}

export async function addSubcategory(categoryId: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;
  const { data: last } = await supabase
    .from("subcategories").select("display_order").eq("category_id", categoryId)
    .order("display_order", { ascending: false }).limit(1);
  await supabase
    .from("subcategories")
    .insert({ category_id: categoryId, name, display_order: (last?.[0]?.display_order ?? 0) + 10 });
  done();
}

export async function rename(table: Table, id: string, fd: FormData) {
  const { supabase } = await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from(table).update({ name }).eq("id", id);
  done();
}

export async function setActive(table: Table, id: string, active: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from(table).update({ is_active: active }).eq("id", id);
  // Deactivating a category hides it for new entries; existing enquiries keep their links.
  done();
}

export async function move(table: Table, id: string, dir: -1 | 1) {
  const { supabase } = await requireAdmin();
  const { data: row } = await supabase.from(table).select("*").eq("id", id).single();
  if (!row) return;
  let q = supabase.from(table).select("id").order("display_order").order("name");
  if (table === "subcategories") q = q.eq("category_id", row.category_id);
  const { data: sibs } = await q;
  const ids = (sibs ?? []).map((s) => s.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((sid, n) => supabase.from(table).update({ display_order: (n + 1) * 10 }).eq("id", sid)));
  done();
}
