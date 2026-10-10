"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { burstFrom } from "@/lib/confetti";
import { formatPrice } from "@/lib/format";
import s from "./BookingCard.module.css";

type Props = { eventId: string; price: number; left: number; capacity: number; past: boolean; available: boolean; signedIn: boolean };

export default function BookingCard({ eventId, price, left, capacity, past, available, signedIn }: Props) {
  const router = useRouter();
  const [ticketType, setTicketType] = useState<"general" | "vip">("general");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const bookButton = useRef<HTMLButtonElement>(null);

  const total = ticketType === "vip" ? price * 2 : price;
  const canBook = !past && available && left > 0;
  const booked = message?.ok === true;

  async function book() {
    if (!signedIn) {
      router.push(`/auth/login?next=/events/${eventId}`);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api.createBooking({ eventId, ticketType });
      setMessage({ ok: true, text: "You're in. Your ticket is under My Tickets." });
      if (bookButton.current) burstFrom(bookButton.current);
      router.refresh(); // refresh the seat count rendered on the server
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Booking failed. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.ticket}>
      <div className={`${s.top} notch-b`}>
        <div className={s.priceRow}>
          <span className={s.priceLabel}>{ticketType === "vip" ? "VIP ticket" : "General admission"}</span>
          <span className={`${s.price} num`}>{formatPrice(total)}</span>
        </div>

        <div className={s.types} role="radiogroup" aria-label="Ticket type">
          <button type="button" role="radio" className={s.type} aria-checked={ticketType === "general"} onClick={() => setTicketType("general")}>
            <strong>General</strong>
            <span className="num">{formatPrice(price)}</span>
          </button>
          <button type="button" role="radio" className={s.type} aria-checked={ticketType === "vip"} onClick={() => setTicketType("vip")}>
            <strong>
              <Sparkle size={14} weight="fill" aria-hidden="true" /> VIP
            </strong>
            <span className="num">{formatPrice(price * 2)} · perks</span>
          </button>
        </div>
      </div>

      <div className={`${s.bottom} notch-t perf-t`}>
        <p className={`${s.seats} num`}>
          {past ? "This event has ended" : left > 0 ? <><strong>{left}</strong> of {capacity} seats left</> : "Sold out"}
        </p>

        <button ref={bookButton} className="btn btn-primary btn-lg btn-block" onClick={book} disabled={busy || booked || !canBook}>
          {busy ? "Booking…" : booked ? "Booked" : past ? "Event Ended" : !available ? "Not Available" : left === 0 ? "Sold Out" : signedIn ? "Get Ticket" : "Sign In to Book"}
        </button>

        <div aria-live="polite">
          {message && (
            <p className={`alert ${message.ok ? "alert-success" : "alert-error"} ${s.message}`}>
              {message.ok ? <CheckCircle size={16} aria-hidden="true" /> : <WarningCircle size={16} aria-hidden="true" />}
              <span>
                {message.text}
                {message.ok && (
                  <>
                    {" "}
                    <Link href="/bookings" className={s.messageLink}>View tickets</Link>
                  </>
                )}
              </span>
            </p>
          )}
        </div>
      </div>

      {booked && (
        <span className={s.stamp} aria-hidden="true">
          Booked
        </span>
      )}
    </div>
  );
}
