import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarBlank, MapPin, Sparkle, Ticket } from "@phosphor-icons/react/ssr";
import TicketQR from "@/components/TicketQR";
import CancelBookingButton from "./CancelBookingButton";
import { apiFetch } from "@/lib/server";
import { categoryMeta } from "@/lib/categories";
import { formatDate, formatPrice, formatTime, isPast } from "@/lib/format";
import type { Booking } from "@/types";
import s from "./bookings.module.css";

export const metadata: Metadata = { title: "My tickets" };

export default async function BookingsPage() {
  const bookings = await apiFetch<Booking[]>("/bookings/my");
  const isLive = (b: Booking) => b.status === "confirmed" && !!b.eventId && !isPast(b.eventId.date);
  const upcoming = bookings.filter(isLive);
  const history = bookings.filter((b) => !isLive(b));

  const ticket = (booking: Booking, i: number) => {
    const event = booking.eventId;
    const meta = categoryMeta(event?.category ?? "other");
    const live = isLive(booking);
    const status = !event ? "Event removed" : booking.status === "cancelled" ? "Cancelled" : isPast(event.date) ? "Attended" : "Confirmed";
    const statusClass = status === "Confirmed" ? "badge-success" : status === "Attended" ? "badge-accent" : "";

    return (
      <li key={booking._id} className={`rise ${s.ticket} ${live ? "" : s.past}`} style={{ "--i": i } as React.CSSProperties} data-tone={meta.tone}>
        <div className={s.main}>
          <div className={s.thumb}>
            {event?.imageUrl ? (
              <Image src={event.imageUrl} alt="" fill sizes="160px" />
            ) : (
              <span className={s.thumbIcon}>
                <meta.icon size={32} weight="duotone" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className={s.info}>
            <div className={s.badges}>
              <span className={`badge ${statusClass}`}>{status}</span>
              <span className="badge">
                {booking.ticketType === "vip" ? (
                  <>
                    <Sparkle size={12} weight="fill" aria-hidden="true" /> VIP
                  </>
                ) : (
                  "General"
                )}
              </span>
            </div>
            <h2 className={s.title}>{event ? <Link href={`/events/${event._id}`}>{event.title}</Link> : "Event no longer available"}</h2>
            <div className={s.rows}>
              <span>
                <CalendarBlank size={15} aria-hidden="true" />
                {event ? `${formatDate(event.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${formatTime(event.date)}` : formatDate(booking.bookingDate)}
              </span>
              <span>
                <MapPin size={15} aria-hidden="true" /> {event?.location ?? "Unknown"}
              </span>
              <span className="num">Paid {formatPrice(booking.amount)}</span>
            </div>
            {live && (
              <div className={s.actions}>
                <Link href={`/events/${event!._id}`} className="btn btn-secondary btn-sm">View Event</Link>
                <CancelBookingButton id={booking._id} />
              </div>
            )}
          </div>
        </div>
        <div className={s.stub}>
          <span className={s.qr}>
            <TicketQR code={booking.ticketCode} size={92} />
          </span>
          <span className={`mono ${s.code}`}>{booking.ticketCode}</span>
        </div>
      </li>
    );
  };

  return (
    <div className="container">
      <header className={s.head}>
        <h1 className="h1">My tickets</h1>
        <Link href="/events" className="text-link">Find more events</Link>
      </header>

      {bookings.length === 0 ? (
        <div className="empty">
          <Ticket size={40} weight="duotone" aria-hidden="true" />
          <h2 className="h3">No tickets yet</h2>
          <p className="muted">Explore events and book your first seat. It shows up here with a QR code for the door.</p>
          <Link href="/events" className="btn btn-primary">Browse Events</Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && <ul className={s.list}>{upcoming.map(ticket)}</ul>}
          {history.length > 0 && (
            <>
              <h2 className={s.groupTitle}>Past and cancelled</h2>
              <ul className={s.list}>{history.map((b, i) => ticket(b, i + upcoming.length))}</ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
