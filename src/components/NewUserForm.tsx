"use client";

import { useActionState } from "react";
import { createUser, type TeamState } from "@/app/(app)/team/actions";

export default function NewUserForm() {
  const [state, action, pending] = useActionState(createUser, undefined as TeamState);
  return (
    <form action={action} className="card grid gap-3 md:grid-cols-5 md:items-end">
      <div>
        <label className="label" htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Temporary password</label>
        <input id="password" name="password" type="text" minLength={10} className="input" required autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="role">Role</label>
        <select id="role" name="role" className="input">
          <option value="team_member">Team member</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      <button className="btn" disabled={pending}>{pending ? "Creating…" : "Add user"}</button>
      {state?.message && (
        <p role="status" className={`md:col-span-5 text-sm ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
