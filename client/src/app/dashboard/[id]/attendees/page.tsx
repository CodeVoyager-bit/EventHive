import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, SealCheck, Users } from "@phosphor-icons/react/ssr";
import CheckInDesk from "./CheckInDesk";
import { apiFetch, ApiError } from "@/lib/server";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import type { Booking, Event } from "@/types";
import s from "../../dashboard.module.css";

export const metadata: Metadata = { title: "Attendees" };

export default async function AttendeesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let event: Event;
  let bookings: Booking[];
  try {
    [event, bookings] = await Promise.all([apiFetch<Event>(`/events/${id}`), apiFetch<Booking[]>(`/bookings/event/${id}`)]);
  } catch (err) {
    if (err instanceof ApiError && [400, 403, 404].includes(err.status)) notFound(); // not yours, or gone
    throw err;
  }

  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const checkedIn = confirmed.filter((b) => b.checkedInAt).length;
  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const revenue = confirmed.reduce((sum, b) => sum + b.amount, 0);
  const attendee = (b: Booking) => (typeof b.userId === "object" ? b.userId : { name: "Unknown", email: "" });

  return (
    <div className="container">
      <Link href="/dashboard" className={s.back}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
      </Link>
      <header className={s.head} style={{ paddingTop: 16 }}>
        <div>
          <h1 className="h1">{event.title}</h1>
          <p className="muted" style={{ marginTop: 8 }}>{formatDateTime(event.date)}, {event.location}</p>
        </div>
        <Link href={`/events/${event._id}`} className="btn btn-secondary">View Event Page</Link>
      </header>

      <div className={s.summary}>
        <div><strong className="num">{confirmed.length}</strong><span>Confirmed</span></div>
        <div><strong className="num">{checkedIn}/{confirmed.length}</strong><span>Checked in</span></div>
        <div><strong className="num">{Math.max(event.capacity - event.bookedCount, 0)}</strong><span>Seats left</span></div>
        <div><strong className="num">{formatPrice(revenue)}</strong><span>Revenue</span></div>
        <div><strong className="num">{bookings.length - confirmed.length}</strong><span>Cancelled</span></div>
      </div>

      {confirmed.length > 0 && <CheckInDesk eventId={event._id} />}

      <section className={`card ${s.tableCard}`} aria-label="Attendee list">
        {bookings.length === 0 ? (
          <div className="empty" style={{ border: 0, background: "transparent" }}>
            <Users size={40} weight="duotone" aria-hidden="true" />
            <h2 className="h3">No bookings yet</h2>
            <p className="muted">Share the event page to start selling tickets.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Ticket</th>
                  <th>Code</th>
                  <th>Paid</th>
                  <th>Booked</th>
                  <th>Status</th>
                  <th>Door</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: 600 }}>{attendee(b).name}</td>
                    <td>{attendee(b).email}</td>
                    <td>{b.ticketType === "vip" ? "VIP" : "General"}</td>
                    <td><code className="mono small">{b.ticketCode}</code></td>
                    <td className="num">{formatPrice(b.amount)}</td>
                    <td className="num">{formatDate(b.bookingDate, { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td><span className={`badge ${b.status === "confirmed" ? "badge-success" : ""}`}>{b.status === "confirmed" ? "Confirmed" : "Cancelled"}</span></td>
                    <td className="num">
                      {b.checkedInAt ? (
                        <span className="badge badge-accent">
                          <SealCheck size={13} weight="fill" aria-hidden="true" /> {time(b.checkedInAt)}
                        </span>
                      ) : (
                        <span className="muted">Not yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
