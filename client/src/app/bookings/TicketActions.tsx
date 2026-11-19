"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowsLeftRight, QrCode, SealCheck, WarningCircle, X } from "@phosphor-icons/react";
import LiveTicketQR from "@/components/LiveTicketQR";
import { api } from "@/lib/api";
import { formatDateTime, formatTime } from "@/lib/format";
import s from "./bookings.module.css";

type TicketView = {
  _id: string;
  ref: string;
  secret?: string;
  holderName: string;
  tierName: string;
  checkedInAt?: string;
  eventTitle: string;
  eventDate: string;
  where: string;
};

// Full-screen live ticket for the door, in a native dialog
export function ShowTicket({ ticket }: { ticket: TicketView }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => ref.current?.showModal()}>
        <QrCode size={16} weight="bold" aria-hidden="true" /> Show ticket
      </button>
      <dialog ref={ref} className={`dialog ${s.ticketDialog}`} aria-label={`Ticket for ${ticket.eventTitle}`}>
        <button type="button" className={`icon-btn ${s.close}`} onClick={() => ref.current?.close()} aria-label="Close">
          <X size={20} weight="bold" aria-hidden="true" />
        </button>
        <div className={s.bigTicket}>
          <p className="tag">{ticket.tierName}</p>
          <h2 className={s.bigTitle}>{ticket.eventTitle}</h2>
          <p className="small">{formatDateTime(ticket.eventDate)}</p>
          <p className="small muted">{ticket.where}</p>
          <div className={`tear ${s.bigTear}`} />
          {ticket.checkedInAt ? (
            <div className={s.admitted}>
              <SealCheck size={40} weight="fill" aria-hidden="true" />
              <strong>Admitted</strong>
              <span className="mono small">at {formatTime(ticket.checkedInAt)}</span>
            </div>
          ) : ticket.secret ? (
            <LiveTicketQR secret={ticket.secret} ticketRef={ticket.ref} size={220} />
          ) : null}
          <p className={s.holder}>
            <span className="tag muted">Name</span>
            <strong>{ticket.holderName}</strong>
          </p>
          <p className="help">Turn your brightness up. Staff scan the QR or type the door code.</p>
        </div>
      </dialog>
    </>
  );
}

// Send a ticket to another EventHive user; it re-keys, so this copy stops working
export function TransferTicket({ ticketId, eventTitle }: { ticketId: string; eventTitle: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.transferTicket(ticketId, email.trim());
      ref.current?.close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => ref.current?.showModal()}>
        <ArrowsLeftRight size={16} weight="bold" aria-hidden="true" /> Send
      </button>
      <dialog ref={ref} className="dialog" aria-labelledby={`send-${ticketId}`}>
        <form onSubmit={submit} className={s.sendForm}>
          <h2 id={`send-${ticketId}`} className="h3">Send this ticket</h2>
          <p className="muted">Your friend gets it in their My Tickets for {eventTitle}, with a fresh code. Yours stops working straight away.</p>
          <div className="field">
            <label className="label" htmlFor={`email-${ticketId}`}>Friend&apos;s EventHive email</label>
            <input id={`email-${ticketId}`} type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" autoComplete="off" />
          </div>
          {error && (
            <p className="alert alert-error" role="alert">
              <WarningCircle size={16} aria-hidden="true" /> {error}
            </p>
          )}
          <div className={s.sendActions}>
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : "Send ticket"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function LeaveWaitlist({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span style={{ display: "grid", gap: 4, justifyItems: "end" }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await api.leaveWaitlist(eventId);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not leave the waitlist");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Leaving…" : "Leave waitlist"}
      </button>
      {error && <span className="small" role="alert" style={{ color: "var(--danger-text)" }}>{error}</span>}
    </span>
  );
}
