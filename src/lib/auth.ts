import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: "admin" | "team_member";
  is_active: boolean;
};

/**
 * Verified session + active profile, or redirect to /login.
 * Cached per request so the layout and the page share one lookup, and the JWT is
 * verified locally (getClaims) instead of a round trip to the auth server.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .eq("id", userId)
    .single<Profile>();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=inactive");
  }
  return { supabase, profile };
});

export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile.role !== "admin") redirect("/");
  return ctx;
}
