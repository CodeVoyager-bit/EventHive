"use client";

import { useRef, useState, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import s from "./ConfirmButton.module.css";

type Props = {
  children: ReactNode;
  className?: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
};

// A button that asks for confirmation in a native <dialog> before running an action
export default function ConfirmButton({ children, className = "btn btn-danger btn-sm", title, description, confirmLabel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      ref.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog ref={ref} className="dialog" aria-labelledby="confirm-title">
        <div className={s.body}>
          <h2 id="confirm-title" className={s.title}>{title}</h2>
          <p className={s.desc}>{description}</p>
          {error && (
            <p className="alert alert-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" /> {error}
            </p>
          )}
          <div className={s.actions}>
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()} disabled={busy}>
              Keep it
            </button>
            <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
              {busy ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
