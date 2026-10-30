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
