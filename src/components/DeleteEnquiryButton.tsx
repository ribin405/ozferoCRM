"use client";

import { useRef, useState, useTransition } from "react";
import { deleteEnquiry } from "@/app/(app)/enquiries/actions";
import Icon from "@/components/Icon";

/** Admin-only delete with an in-page confirmation. Pass redirectTo to leave the page after deleting. */
export default function DeleteEnquiryButton({
  id,
  name,
  redirectTo,
  className = "act danger",
}: {
  id: string;
  name: string;
  redirectTo?: string;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const confirm = () =>
    start(async () => {
      const res = await deleteEnquiry(id, redirectTo);
      if (res?.error) setError(res.error);
      else dialog.current?.close();
    });

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setError("");
          dialog.current?.showModal();
        }}
      >
        <Icon name="trash" className="h-[18px] w-[18px]" />
        Delete
      </button>

      <dialog ref={dialog} className="dlg" aria-labelledby={`del-${id}`} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <h2 id={`del-${id}`}>Delete this enquiry?</h2>
        <p>
          <b>{name}</b> and its follow-up history will be permanently removed. This can’t be undone.
        </p>
        {error && <p role="alert" className="dlg-error">{error}</p>}
        <div className="dlg-actions">
          <button type="button" className="btn-secondary fbig" onClick={() => dialog.current?.close()} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="dlg-delete fbig" onClick={confirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete enquiry"}
          </button>
        </div>
      </dialog>
    </>
  );
}
