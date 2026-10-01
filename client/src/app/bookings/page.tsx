import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Sparkles, Ticket } from "lucide-react";
import TicketQR from "@/components/TicketQR";
import CancelBookingButton from "./CancelBookingButton";
import { apiFetch } from "@/lib/server";
import { categoryMeta, catStyle } from "@/lib/categories";
import { formatDate, formatPrice, formatTime, isPast } from "@/lib/format";
import type { Booking } from "@/types";
import s from "./bookings.module.css";

export const metadata: Metadata = { title: "My tickets" };

export default async function BookingsPage() {
  const bookings = await apiFetch<Booking[]>("/bookings/my");
  const isLive = (b: Booking) => b.status === "confirmed" && !!b.eventId && !isPast(b.eventId.date);
  const upcoming = bookings.filter(isLive);
  const history = bookings.filter((b) => !isLive(b));

  const ticket = (booking: Booking) => {
    const event = booking.eventId;
    const meta = categoryMeta(event?.category ?? "other");
    const Icon = meta.icon;
    const live = isLive(booking);
    const status = !event ? "Event removed" : booking.status === "cancelled" ? "Cancelled" : isPast(event.date) ? "Attended" : "Confirmed";
    const statusClass = status === "Confirmed" ? "badge-success" : status === "Attended" ? "badge-brand" : "badge-danger";

    return (
      <li key={booking._id} className={`card ${s.ticket} ${live ? "" : s.past}`} style={catStyle(event?.category ?? "other")}>
        <div className={s.thumb}>
          {event?.imageUrl ? <Image src={event.imageUrl} alt="" fill sizes="140px" /> : <span className={s.thumbIcon}><Icon size={32} aria-hidden="true" /></span>}
        </div>
        <div className={s.info}>
          <div className={s.badges}>
            <span className={`badge ${statusClass}`}>{status}</span>
            <span className="badge">{booking.ticketType === "vip" ? <><Sparkles size={12} aria-hidden="true" /> VIP</> : "General"}</span>
            <span className="badge badge-cat">{meta.label}</span>
          </div>
          <h2 className="h3">{event ? <Link href={`/events/${event._id}`}>{event.title}</Link> : "Event no longer available"}</h2>
          <div className={s.rows}>
            <span><Calendar size={14} aria-hidden="true" /> {event ? `${formatDate(event.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · ${formatTime(event.date)}` : formatDate(booking.bookingDate)}</span>
            <span><MapPin size={14} aria-hidden="true" /> {event?.location ?? "—"}</span>
            <span className="num">Paid {formatPrice(booking.amount)}</span>
          </div>
          {live && (
            <div className={s.actions}>
              <Link href={`/events/${event!._id}`} className="btn btn-secondary btn-sm">View event</Link>
              <CancelBookingButton id={booking._id} />
            </div>
          )}
        </div>
        <div className={s.stub}>
          <span className={s.qr}><TicketQR code={booking.ticketCode} size={88} /></span>
          <span className={s.code}>{booking.ticketCode}</span>
        </div>
      </li>
    );
  };

  return (
    <div className="container section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="h2">My tickets</h1>
        </div>
        <Link href="/events" className="btn btn-secondary">Find more events</Link>
      </div>

      {bookings.length === 0 ? (
        <div className="empty">
          <Ticket size={36} aria-hidden="true" />
          <h2 className="h3">No tickets yet</h2>
          <p className="muted">Explore events and book your first ticket.</p>
          <Link href="/events" className="btn btn-primary">Browse events</Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && <ul className={s.list}>{upcoming.map(ticket)}</ul>}
          {history.length > 0 && (
            <>
              <h2 className={s.groupTitle}>Past and cancelled</h2>
              <ul className={s.list}>{history.map(ticket)}</ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
