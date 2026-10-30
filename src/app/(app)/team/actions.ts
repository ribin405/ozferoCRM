"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export type TeamState = { message?: string; ok?: boolean } | undefined;

/** Admin-only: create a user with a temporary password. Uses the service-role key server-side. */
export async function createUser(_prev: TeamState, fd: FormData): Promise<TeamState> {
  await requireAdmin();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const full_name = String(fd.get("full_name") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const role = fd.get("role") === "admin" ? "admin" : "team_member";
  if (!email || !full_name) return { message: "Name and email are required." };
  if (password.length < 10) return { message: "Temporary password must be at least 10 characters." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) return { message: error.message };
  if (role === "admin") await admin.from("profiles").update({ role }).eq("id", data.user.id);
  revalidatePath("/team");
  return { ok: true, message: `Created ${email}. Share the temporary password securely.` };
}

export async function updateMember(id: string, fd: FormData) {
  const { supabase, profile } = await requireAdmin();
  if (id === profile.id) return; // never let an admin lock themselves out
  const role = fd.get("role") === "admin" ? "admin" : "team_member";
  const is_active = fd.get("is_active") === "on";
  await supabase.from("profiles").update({ role, is_active }).eq("id", id);
  if (!is_active) {
    // Revoke existing sessions so deactivation takes effect immediately.
    await createAdminClient().auth.admin.signOut(id, "global").catch(() => {});
  }
  revalidatePath("/team");
}
