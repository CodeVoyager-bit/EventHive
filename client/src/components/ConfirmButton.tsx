"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import s from "./ConfirmButton.module.css";

type Props = {
  children: ReactNode;
  className?: string;
  title: string;
  description: string;
  confirmLabel: string;
  keepLabel?: string;
  onConfirm: () => Promise<void>;
};

// A button that asks for confirmation in a native <dialog> before running an action
export default function ConfirmButton({ children, className = "btn btn-danger btn-sm", title, description, confirmLabel, keepLabel = "Keep it", onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId(); // several confirm dialogs can share a page
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      ref.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog ref={ref} className="dialog" aria-labelledby={titleId}>
        <div className={s.body}>
          <span className={s.icon} aria-hidden="true">
            <WarningCircle size={24} weight="bold" />
          </span>
          <h2 id={titleId} className={s.title}>{title}</h2>
          <p className={s.desc}>{description}</p>
          {error && (
            <p className="alert alert-error" role="alert">
              <WarningCircle size={16} aria-hidden="true" /> {error}
            </p>
          )}
          <div className={s.actions}>
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()} disabled={busy}>
              {keepLabel}
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
