"use client";

import { useActionState, useEffect, useRef } from "react";
import { addFollowUp, type FormState } from "@/app/(app)/enquiries/actions";
import { ACTIVITY_TYPES, STATUSES, STATUS_LABEL, label } from "@/lib/constants";

const uaeNow = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  })
    .format(new Date())
    .replace(" ", "T");

export default function FollowUpForm({ enquiryId, currentStatus }: { enquiryId: string; currentStatus: string }) {
  const [state, action, pending] = useActionState(addFollowUp, undefined as FormState);
  const ref = useRef<HTMLFormElement>(null);
  const err = state?.errors ?? {};
  // Default the contact time to "now" in UAE time (the team's time zone), e.g. 2026-10-30T14:05.
  const setNow = () => {
    const field = ref.current?.elements.namedItem("activity_at");
    if (field instanceof HTMLInputElement) field.value = uaeNow();
  };
  useEffect(setNow, []);
  useEffect(() => {
    if (state?.message === "Follow-up saved.") {
      ref.current?.reset();
      setNow();
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="enquiry_id" value={enquiryId} />
      <div>
        <label className="label" htmlFor="activity_type">Contact method</label>
        <select id="activity_type" name="activity_type" className="input" defaultValue="call">
          {ACTIVITY_TYPES.map((a) => (
            <option key={a} value={a}>{label(a)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="activity_at">Contact date & time</label>
        <input id="activity_at" name="activity_at" type="datetime-local" className="input" required />
        {err.activity_at && <p className="mt-1 text-xs text-rose-600">{err.activity_at}</p>}
      </div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="outcome">Outcome</label>
        <input id="outcome" name="outcome" className="input" placeholder="e.g. Asked to call back next week" />
      </div>
      <div className="md:col-span-2">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="fu_status">Update status</label>
        <select id="fu_status" name="status" className="input" defaultValue={currentStatus === "new" ? "contacted" : currentStatus}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="fu_next">Next follow-up date</label>
        <input id="fu_next" name="next_follow_up_at" type="date" className="input" />
      </div>
      <div className="flex items-center gap-3 md:col-span-2">
        <button className="btn" disabled={pending}>{pending ? "Saving…" : "Log follow-up"}</button>
        {state?.message && (
          <span role="status" className={state.message.endsWith("saved.") ? "text-sm text-emerald-700" : "text-sm text-rose-600"}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
