import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChartLineUp, CurrencyDollar, GridFour, PencilSimple, Ticket, Users } from "@phosphor-icons/react/ssr";
import DeleteEventButton from "./DeleteEventButton";
import { apiFetch } from "@/lib/server";
import { categoryMeta } from "@/lib/categories";
import { formatDate, formatPrice, isPast } from "@/lib/format";
import type { Event } from "@/types";
import s from "./dashboard.module.css";

export const metadata: Metadata = { title: "Organizer dashboard" };

export default async function DashboardPage() {
  const events = await apiFetch<Event[]>("/events/my/events");
  const sold = events.reduce((sum, e) => sum + e.bookedCount, 0);
  const capacity = events.reduce((sum, e) => sum + e.capacity, 0);
  const revenue = events.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
  const upcoming = events.filter((e) => !isPast(e.date)).length;

  const stats = [
    { label: "Revenue", value: formatPrice(revenue), icon: CurrencyDollar, primary: true, tone: "violet" },
    { label: "Tickets sold", value: sold.toLocaleString("en-US"), icon: Ticket, tone: "pink" },
    { label: "Upcoming events", value: upcoming, icon: ChartLineUp, tone: "blue" },
    { label: "Seats filled", value: capacity ? `${Math.round((sold / capacity) * 100)}%` : "0%", icon: GridFour, tone: "lime" },
  ];

  return (
    <div className="container">
      <header className={s.head}>
        <h1 className="h1">Dashboard</h1>
        <Link href="/dashboard/create" className="btn btn-primary">
          <CalendarPlus size={18} aria-hidden="true" /> Create Event
        </Link>
      </header>

      <div className={s.stats}>
        {stats.map(({ label, value, icon: Icon, primary, tone }, i) => (
          <div key={label} className={`rise ${s.stat} ${primary ? s.statPrimary : ""}`} style={{ "--i": i } as React.CSSProperties} data-tone={tone}>
            <Icon size={22} aria-hidden="true" className={s.statIcon} />
            <div className={`${s.statValue} num`}>{value}</div>
            <div className={s.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      <section className={`card ${s.tableCard}`} aria-labelledby="my-events">
        <div className={s.tableHead}>
          <h2 id="my-events" className="h3">My events</h2>
          <span className="small muted num">{events.length} total</span>
        </div>
        {events.length === 0 ? (
          <div className="empty" style={{ border: 0, background: "transparent" }}>
            <GridFour size={40} weight="duotone" aria-hidden="true" />
            <h3 className="h3">No events yet</h3>
            <p className="muted">Create your first event to start selling tickets.</p>
            <Link href="/dashboard/create" className="btn btn-primary">Create Event</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Sold</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const past = isPast(event.date);
                  const meta = categoryMeta(event.category);
                  const pct = Math.min(100, Math.round((event.bookedCount / event.capacity) * 100));
                  return (
                    <tr key={event._id}>
                      <td>
                        <Link href={`/events/${event._id}`} className={s.evTitle}>{event.title}</Link>
                        <div className={s.evLoc}>{event.location}</div>
                      </td>
                      <td className="num">{formatDate(event.date, { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td data-tone={meta.tone}>
                        <span className={`badge ${s.catBadge}`}>
                          <meta.icon size={14} aria-hidden="true" /> {meta.label}
                        </span>
                      </td>
                      <td>
                        <span className="num">{event.bookedCount}/{event.capacity}</span>
                        <div className={s.bar} aria-hidden="true">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className={`${s.revenue} num`}>{formatPrice(event.revenue ?? 0)}</td>
                      <td>
                        <span className={`badge ${event.status === "published" ? (past ? "" : "badge-success") : event.status === "draft" ? "badge-warning" : "badge-danger"}`}>
                          {event.status === "published" ? (past ? "Ended" : "Live") : event.status === "draft" ? "Draft" : "Cancelled"}
                        </span>
                      </td>
                      <td>
                        <div className={s.actions}>
                          <Link href={`/dashboard/${event._id}/attendees`} className="btn btn-ghost btn-sm">
                            <Users size={15} aria-hidden="true" /> Attendees
                          </Link>
                          <Link href={`/dashboard/${event._id}/edit`} className="btn btn-secondary btn-sm">
                            <PencilSimple size={15} aria-hidden="true" /> Edit
                          </Link>
                          <DeleteEventButton id={event._id} title={event.title} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
