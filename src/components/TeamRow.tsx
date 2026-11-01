"use client";

import { useActionState } from "react";
import { updateMember, type TeamState } from "@/app/(app)/team/actions";

export default function TeamRow({
  member,
  isSelf,
}: {
  member: { id: string; full_name: string; email: string | null; role: string; is_active: boolean };
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState(updateMember.bind(null, member.id), undefined as TeamState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1 basis-48">
        <div className="truncate font-medium">{member.full_name}</div>
        <div className="truncate text-xs text-slate-500">{member.email}</div>
      </div>
      <select
        name="role"
        defaultValue={member.role}
        className="input w-full sm:w-44"
        disabled={isSelf}
        aria-label={`Role for ${member.full_name}`}
      >
        <option value="team_member">Team member</option>
        <option value="admin">Administrator</option>
      </select>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={member.is_active} disabled={isSelf} className="h-4 w-4" /> Active
      </label>
      <button className="btn-secondary min-h-11 px-4" disabled={isSelf || pending}>
        {isSelf ? "You" : pending ? "Saving…" : "Save"}
      </button>
      {state?.message && (
        <p role="status" className={`basis-full text-sm ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
