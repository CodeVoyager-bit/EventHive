"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import s from "./BookingCard.module.css";

type Props = { eventId: string; price: number; left: number; capacity: number; past: boolean; available: boolean; signedIn: boolean };

export default function BookingCard({ eventId, price, left, capacity, past, available, signedIn }: Props) {
  const router = useRouter();
  const [ticketType, setTicketType] = useState<"general" | "vip">("general");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const total = ticketType === "vip" ? price * 2 : price;
  const pct = Math.min(100, Math.round(((capacity - left) / capacity) * 100));
  const canBook = !past && available && left > 0;

  async function book() {
    if (!signedIn) {
      router.push(`/auth/login?next=/events/${eventId}`);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api.createBooking({ eventId, ticketType });
      setMessage({ ok: true, text: "Ticket booked. Find it under My Tickets." });
      router.refresh(); // refresh the seat count rendered on the server
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Booking failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card ${s.card}`}>
      <div className={s.priceRow}>
        <span className="eyebrow">Price</span>
        <span className={s.price}>{formatPrice(total)}</span>
      </div>

      <div className="field">
        <span className="label">Ticket type</span>
        <div className={s.types} role="group" aria-label="Ticket type">
          <button type="button" className={s.type} aria-pressed={ticketType === "general"} onClick={() => setTicketType("general")}>
            <strong>General</strong>
            <span>{formatPrice(price)}</span>
          </button>
          <button type="button" className={s.type} aria-pressed={ticketType === "vip"} onClick={() => setTicketType("vip")}>
            <strong><Sparkles size={14} aria-hidden="true" /> VIP</strong>
            <span>{formatPrice(price * 2)} · perks included</span>
          </button>
        </div>
      </div>

      <div>
        <div className={s.bar} aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="small muted num" style={{ marginTop: 6 }}>
          {past ? "This event has ended" : left > 0 ? `${left} of ${capacity} seats left` : "Sold out"}
        </p>
      </div>

      <button className="btn btn-primary btn-lg btn-block" onClick={book} disabled={busy || !canBook}>
        {busy ? "Booking…" : past ? "Event ended" : !available ? "Not available" : left === 0 ? "Sold out" : signedIn ? "Book ticket" : "Sign in to book"}
      </button>

      {message && (
        <p className={`alert ${message.ok ? "alert-success" : "alert-error"}`} role="status">
          {message.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
          <span>
            {message.text}
            {message.ok && (
              <>
                {" "}
                <Link href="/bookings" style={{ fontWeight: 700, textDecoration: "underline" }}>View tickets</Link>
              </>
            )}
          </span>
        </p>
      )}
    </div>
  );
}
