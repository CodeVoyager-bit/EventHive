"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Flag } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import s from "./ReportButton.module.css";

export const REPORT_REASONS = [
  { value: "scam", label: "It's a scam or a fake event" },
  { value: "wrong_info", label: "The details are wrong or misleading" },
  { value: "offensive", label: "It's offensive or harmful" },
  { value: "spam", label: "It's spam" },
  { value: "other", label: "Something else" },
] as const;

type Props = { kind: "event" | "question"; targetId: string; signedIn: boolean; label?: string };

// Flag an event or a question for the EventHive team (the admin console's report queue)
export default function ReportButton({ kind, targetId, signedIn, label = "Report" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  function open() {
    if (!signedIn) return router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
    ref.current?.showModal();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.report({ kind, targetId, reason, note: note.trim() || undefined });
      setSent("Thanks. The EventHive team will take a look, and you'll hear from us if we remove it.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send the report";
      if (/already reported/i.test(message)) setSent(message);
      else setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={s.trigger} onClick={open}>
        <Flag size={14} weight="bold" aria-hidden="true" /> {label}
      </button>
      <dialog ref={ref} className="dialog" aria-labelledby={titleId}>
        {sent ? (
          <div className={s.body} role="status">
            <h2 id={titleId} className={s.title}>Report sent</h2>
            <p className="muted">{sent}</p>
            <div className={s.actions}>
              <button type="button" className="btn btn-primary" onClick={() => ref.current?.close()}>Done</button>
            </div>
          </div>
        ) : (
          <form className={s.body} onSubmit={submit}>
            <h2 id={titleId} className={s.title}>Report this {kind}</h2>
            <fieldset className={s.reasons}>
              <legend className="label">What&apos;s wrong?</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="check">
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} required />
                  <span>{r.label}</span>
                </label>
              ))}
            </fieldset>
            <label className="field">
              <span className="label">Anything else? <span className="muted">(optional)</span></span>
              <textarea className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should our team know?" />
            </label>
            {error && <p className="alert alert-error" role="alert">{error}</p>}
            <div className={s.actions}>
              <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-danger" disabled={busy || !reason}>{busy ? "Sending…" : "Send report"}</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
