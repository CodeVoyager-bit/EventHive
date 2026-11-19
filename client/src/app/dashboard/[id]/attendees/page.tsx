import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hourglass, Users } from "@phosphor-icons/react/ssr";
import CheckInDesk from "@/components/CheckInDesk";
import DoorTeam from "./DoorTeam";
import EventTabs, { BackToEvents } from "../EventTabs";
import GuestList, { type GuestRow } from "./GuestList";
import RequestActions from "./RequestActions";
import { apiFetch, ApiError } from "@/lib/server";
import { formatDate, formatDateTime, formatMoney, formatTime, plural } from "@/lib/format";
import type { Booking, Event, TeamMember, WaitlistEntry } from "@/types";
import s from "./attendees.module.css";

export const metadata: Metadata = { title: "Guests" };

const person = (ref: Booking["userId"] | WaitlistEntry["userId"]) => (typeof ref === "object" ? ref : { _id: ref, name: "Unknown", email: "" });

export default async function AttendeesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let event: Event, bookings: Booking[], waitlist: WaitlistEntry[], team: TeamMember[];
  try {
    [event, bookings, waitlist, team] = await Promise.all([
      apiFetch<Event>(`/events/${id}`),
      apiFetch<Booking[]>(`/bookings/event/${id}`),
      apiFetch<WaitlistEntry[]>(`/events/${id}/waitlist`),
      apiFetch<TeamMember[]>(`/events/${id}/team`),
    ]);
  } catch (err) {
    if (err instanceof ApiError && [400, 403, 404].includes(err.status)) notFound(); // not yours, or gone
    throw err;
  }

  const pending = bookings.filter((b) => b.status === "pending");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const closed = bookings.filter((b) => b.status === "cancelled" || b.status === "declined");
  const rows: GuestRow[] = confirmed.flatMap((b) =>
    b.tickets.map((t) => ({
      ticketId: t._id,
      holder: t.holderName,
      buyer: person(b.userId).name,
      email: typeof t.ownerId === "object" ? t.ownerId.email : person(b.userId).email,
      tier: t.tierName,
      ref: t.ref,
      status: t.status,
      checkedInAt: t.checkedInAt ?? null,
      transferred: !!t.transferredAt,
      answers: b.answers.map((a) => `${a.question}: ${a.answer}`).join(" | "),
      referrer: typeof b.referrerId === "object" ? b.referrerId.name : "",
      bookedAt: b.bookingDate,
    }))
  );
  const valid = rows.filter((r) => r.status === "valid");
  const admitted = valid.filter((r) => r.checkedInAt).length;

  return (
    <div className="container">
      <BackToEvents />
      <header className={s.head}>
        <div>
          <p className="tag muted">{formatDateTime(event.date)} · {event.location}</p>
          <h1 className="h1">{event.title}</h1>
        </div>
        <div className={s.counter} aria-live="polite">
          <strong>{admitted}<span>/{valid.length}</span></strong>
          <span className="tag">checked in</span>
        </div>
      </header>
      <EventTabs eventId={id} current="guests" pending={pending.length} />

      {pending.length > 0 && (
        <section className={s.section} aria-labelledby="requests">
          <h2 id="requests" className="h2"><Hourglass size={28} weight="bold" aria-hidden="true" /> Requests ({pending.length})</h2>
          <p className="muted">Seats are held while you decide. Guests are only charged when approved.</p>
          <ul className={s.requests}>
            {pending.map((b) => (
              <li key={b._id} className={s.request}>
                <div>
                  <strong className={s.reqName}>{person(b.userId).name}</strong>
                  <span className="small muted">{person(b.userId).email}</span>
                  <p className="mono small">{plural(b.quantity, "ticket")} · {b.tierName} · {b.pricing.total ? formatMoney(b.pricing.total) : "Free"} · asked {formatDate(b.bookingDate, { day: "numeric", month: "short" })}</p>
                  {b.answers.map((a) => (
                    <p key={a.question} className={s.answer}><span>{a.question}</span> {a.answer}</p>
                  ))}
                </div>
                <RequestActions bookingId={b._id} name={person(b.userId).name} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <CheckInDesk eventId={event._id} />
      {event.status !== "cancelled" && <DoorTeam eventId={event._id} initial={team} />}

      <section className={s.section} aria-labelledby="guests">
        <h2 id="guests" className="h2">Guest list</h2>
        {rows.length === 0 ? (
          <div className="empty">
            <span className="empty-art"><Users size={32} weight="bold" aria-hidden="true" /></span>
            <h3 className="h3">No guests yet</h3>
            <p>Share the event page. Bookings show up here with every ticket holder&apos;s name.</p>
          </div>
        ) : (
          <GuestList rows={rows} eventTitle={event.title} />
        )}
      </section>

      {waitlist.length > 0 && (
        <section className={s.section} aria-labelledby="waitlist">
          <h2 id="waitlist" className="h2">Waitlist ({waitlist.length})</h2>
          <p className="muted">When seats free up, these people are booked automatically in this order.</p>
          <div className="table-wrap card-flat" style={{ marginTop: 14 }}>
            <table className="table">
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Tickets</th><th>Joined</th></tr></thead>
              <tbody>
                {waitlist.map((w, i) => (
                  <tr key={w._id}>
                    <td className="mono">{i + 1}</td>
                    <td><strong>{person(w.userId).name}</strong></td>
                    <td>{person(w.userId).email}</td>
                    <td className="mono">{w.quantity}</td>
                    <td className="mono small">{formatDate(w.createdAt, { day: "numeric", month: "short" })}, {formatTime(w.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <details className={s.closed}>
          <summary>Cancelled and declined ({closed.length})</summary>
          <ul>
            {closed.map((b) => (
              <li key={b._id}>
                <span>{person(b.userId).name} · {plural(b.quantity, "ticket")}</span>
                <span className="mono small muted">{b.status === "declined" ? "Declined" : `Cancelled, refunded ${formatMoney(b.refundAmount ?? 0)}`}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
