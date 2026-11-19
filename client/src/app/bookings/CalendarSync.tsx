"use client";

import { useId, useRef, useState } from "react";
import { ArrowsClockwise, CalendarCheck, Check, Copy } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import s from "./bookings.module.css";

// A private feed of every event you hold tickets for: subscribe once and new bookings, time
// changes and cancellations flow into Google or Apple Calendar by themselves.
export default function CalendarSync() {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const feed = token ? `${location.origin}/calendar/${token}.ics` : "";
  const webcal = feed.replace(/^https?:/, "webcal:");

  async function load(reset = false) {
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      setToken((await (reset ? api.resetCalendarToken() : api.calendarToken())).token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get your calendar link");
    } finally {
      setBusy(false);
    }
  }

  function open() {
    ref.current?.showModal();
    if (!token) load();
  }

  async function copy() {
    await navigator.clipboard.writeText(feed).catch(() => {});
    setCopied(true);
  }

  return (
    <>
      <button type="button" className="text-link" onClick={open}>
        <CalendarCheck size={18} weight="bold" aria-hidden="true" /> Sync to your calendar
      </button>
      <dialog ref={ref} className="dialog" aria-labelledby={titleId}>
        <div className={s.sync}>
          <h2 id={titleId} className={s.syncTitle}>Sync your tickets</h2>
          <p className="muted">
            Subscribe once and every event you book shows up in your calendar, with time changes and cancellations kept up to date. This link is private: anyone with it can see your plans.
          </p>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          {!token ? (
            <p className="muted" aria-live="polite">{busy ? "Getting your link…" : ""}</p>
          ) : (
            <>
              <div className={s.syncLinks}>
                <a className="btn btn-primary" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">Google Calendar</a>
                <a className="btn btn-secondary" href={webcal}>Apple Calendar</a>
              </div>
              <label className="field">
                <span className="label">Or copy the link into any calendar app</span>
                <span className={s.syncCopy}>
                  <input className="input mono" readOnly value={feed} onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn btn-secondary" onClick={copy} aria-label="Copy calendar link">
                    {copied ? <Check size={18} weight="bold" aria-hidden="true" /> : <Copy size={18} weight="bold" aria-hidden="true" />}
                  </button>
                </span>
              </label>
              <p className="small muted" role="status">{copied ? "Copied." : "Calendar apps refresh it every few hours."}</p>
            </>
          )}
          <div className={s.syncActions}>
            {token && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={busy}>
                <ArrowsClockwise size={15} weight="bold" aria-hidden="true" /> {busy ? "Resetting…" : "Reset link"}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => ref.current?.close()}>Done</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
