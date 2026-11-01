import { requireAdmin } from "@/lib/auth";
import NewUserForm from "@/components/NewUserForm";
import TeamRow from "@/components/TeamRow";

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
          <TeamRow key={`${m.id}:${m.role}:${m.is_active}`} member={m} isSelf={m.id === profile.id} />
        ))}
      </div>
    </div>
  );
}
