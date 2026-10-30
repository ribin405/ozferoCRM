import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

async function updateName(fd: FormData) {
  "use server";
  const { supabase, profile } = await requireUser();
  const full_name = String(fd.get("full_name") ?? "").trim();
  if (full_name) await supabase.from("profiles").update({ full_name }).eq("id", profile.id);
  revalidatePath("/", "layout");
}

async function updatePassword(fd: FormData) {
  "use server";
  const { supabase } = await requireUser();
  const password = String(fd.get("password") ?? "");
  if (password.length >= 10) await supabase.auth.updateUser({ password });
}

export default async function Settings() {
  const { profile } = await requireUser();
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <form action={updateName} className="card space-y-3">
        <h2 className="font-semibold">Profile</h2>
        <div>
          <label className="label" htmlFor="full_name">Display name</label>
          <input id="full_name" name="full_name" defaultValue={profile.full_name} className="input" required />
        </div>
        <p className="text-xs text-slate-500">{profile.email} · {profile.role === "admin" ? "Administrator" : "Team member"}</p>
        <button className="btn">Save</button>
      </form>
      <form action={updatePassword} className="card space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <div>
          <label className="label" htmlFor="password">New password (min. 10 characters)</label>
          <input id="password" name="password" type="password" minLength={10} className="input" autoComplete="new-password" required />
        </div>
        <button className="btn">Update password</button>
      </form>
    </div>
  );
}
