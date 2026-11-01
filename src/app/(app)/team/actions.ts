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
  if (role === "admin") {
    const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", data.user.id);
    if (roleError) {
      return { message: `User created as a team member, but making them an administrator failed: ${roleError.message}` };
    }
  }
  revalidatePath("/team");
  return { ok: true, message: `Created ${email}. Share the temporary password securely.` };
}

/** Admin-only: change a member's role and access. Reports the real result instead of failing silently. */
export async function updateMember(id: string, _prev: TeamState, fd: FormData): Promise<TeamState> {
  const { supabase, profile } = await requireAdmin();
  if (id === profile.id) return { message: "You can't change your own role or access." };
  const role = fd.get("role") === "admin" ? "admin" : "team_member";
  const is_active = fd.get("is_active") === "on";

  const { data: target } = await supabase.from("profiles").select("role, is_active").eq("id", id).maybeSingle();
  if (!target) return { message: "That user could not be found." };

  // Never leave the platform without an active administrator.
  if (target.role === "admin" && target.is_active && (role !== "admin" || !is_active)) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_active", true);
    if ((count ?? 0) <= 1) return { message: "At least one active administrator is required." };
  }

  // select() so a change blocked by row-level security shows up as zero rows rather than silent success.
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ role, is_active })
    .eq("id", id)
    .select("role, is_active");
  if (error) return { message: error.message };
  if (!updated?.length) {
    return { message: "The change was not saved. The database refused the update (check the administrator policy on profiles)." };
  }

  if (!is_active) {
    // Revoke existing sessions so deactivation takes effect immediately.
    await createAdminClient().auth.admin.signOut(id, "global").catch(() => {});
  }
  revalidatePath("/team");
  return { ok: true, message: role === "admin" ? "Saved. Now an administrator." : "Saved." };
}
