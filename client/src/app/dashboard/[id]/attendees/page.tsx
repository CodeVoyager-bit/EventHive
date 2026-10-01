import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
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
  const revenue = confirmed.reduce((sum, b) => sum + b.amount, 0);
  const attendee = (b: Booking) => (typeof b.userId === "object" ? b.userId : { name: "Unknown", email: "" });

  return (
    <div className="container section">
      <Link href="/dashboard" className={s.back}>
        <ArrowLeft size={14} aria-hidden="true" /> Back to dashboard
      </Link>
      <div className={s.head}>
        <div>
          <p className="eyebrow">Attendees</p>
          <h1 className="h2">{event.title}</h1>
          <p className="muted small">{formatDateTime(event.date)} · {event.location}</p>
        </div>
        <Link href={`/events/${event._id}`} className="btn btn-secondary">View event page</Link>
      </div>

      <div className={s.summary}>
        <div><strong className="num">{confirmed.length}</strong><span>Confirmed</span></div>
        <div><strong className="num">{event.capacity - event.bookedCount}</strong><span>Seats left</span></div>
        <div><strong className="num">{formatPrice(revenue)}</strong><span>Revenue</span></div>
        <div><strong className="num">{bookings.length - confirmed.length}</strong><span>Cancelled</span></div>
      </div>

      <div className={`card ${s.tableCard}`}>
        {bookings.length === 0 ? (
          <div className="empty" style={{ border: 0 }}>
            <Users size={36} aria-hidden="true" />
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
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: 600 }}>{attendee(b).name}</td>
                    <td>{attendee(b).email}</td>
                    <td>{b.ticketType === "vip" ? "VIP" : "General"}</td>
                    <td><code>{b.ticketCode}</code></td>
                    <td className="num">{formatPrice(b.amount)}</td>
                    <td className="num">{formatDate(b.bookingDate, { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td><span className={`badge ${b.status === "confirmed" ? "badge-success" : "badge-danger"}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
