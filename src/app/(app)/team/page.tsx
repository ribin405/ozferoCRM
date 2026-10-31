import { requireAdmin } from "@/lib/auth";
import NewUserForm from "@/components/NewUserForm";
import { updateMember } from "./actions";

export default async function Team() {
  const { supabase, profile } = await requireAdmin();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .order("full_name");
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Team</h1>
      <NewUserForm />
      <div className="card divide-y p-0">
        {(members ?? []).map((m) => (
          <form key={m.id} action={updateMember.bind(null, m.id)} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{m.full_name}</div>
              <div className="truncate text-xs text-slate-500">{m.email}</div>
            </div>
            <select name="role" defaultValue={m.role} className="input w-full sm:w-40" disabled={m.id === profile.id} aria-label="Role">
              <option value="team_member">Team member</option>
              <option value="admin">Administrator</option>
            </select>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="is_active" defaultChecked={m.is_active} disabled={m.id === profile.id} /> Active
            </label>
            <button className="btn-secondary px-3 py-1" disabled={m.id === profile.id}>
              {m.id === profile.id ? "You" : "Save"}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
