import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, DollarSign, LayoutGrid, Pencil, Ticket, Users } from "lucide-react";
import DeleteEventButton from "./DeleteEventButton";
import { apiFetch } from "@/lib/server";
import { categoryMeta, catStyle } from "@/lib/categories";
import { formatDate, formatPrice, isPast } from "@/lib/format";
import type { Event } from "@/types";
import s from "./dashboard.module.css";

export const metadata: Metadata = { title: "Organizer dashboard" };

export default async function DashboardPage() {
  const events = await apiFetch<Event[]>("/events/my/events");
  const sold = events.reduce((sum, e) => sum + e.bookedCount, 0);
  const revenue = events.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
  const upcoming = events.filter((e) => !isPast(e.date)).length;

  const stats = [
    { label: "Events", value: events.length, icon: LayoutGrid, color: "var(--brand)" },
    { label: "Upcoming", value: upcoming, icon: CalendarPlus, color: "var(--blue)" },
    { label: "Tickets sold", value: sold, icon: Ticket, color: "var(--purple)" },
    { label: "Revenue", value: formatPrice(revenue), icon: DollarSign, color: "var(--green)" },
  ];

  return (
    <div className="container section">
      <div className={s.head}>
        <div>
          <p className="eyebrow">Organizer</p>
          <h1 className="h2">Dashboard</h1>
        </div>
        <Link href="/dashboard/create" className="btn btn-primary">
          <CalendarPlus size={18} aria-hidden="true" /> Create event
        </Link>
      </div>

      <div className={s.stats}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`card ${s.stat}`}>
            <span className={s.statIcon} style={{ background: color }}><Icon size={20} aria-hidden="true" /></span>
            <div>
              <div className={`${s.statValue} num`}>{value}</div>
              <div className={s.statLabel}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={`card ${s.tableCard}`}>
        <div className={s.tableHead}>
          <h2 className="h3">My events</h2>
          <span className="small muted">{events.length} total</span>
        </div>
        {events.length === 0 ? (
          <div className="empty" style={{ border: 0 }}>
            <LayoutGrid size={36} aria-hidden="true" />
            <h3 className="h3">No events yet</h3>
            <p className="muted">Create your first event to start selling tickets.</p>
            <Link href="/dashboard/create" className="btn btn-primary">Create event</Link>
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
                  const pct = Math.min(100, Math.round((event.bookedCount / event.capacity) * 100));
                  return (
                    <tr key={event._id} style={catStyle(event.category)}>
                      <td>
                        <Link href={`/events/${event._id}`} className={s.evTitle}>{event.title}</Link>
                        <div className={s.evLoc}>{event.location}</div>
                      </td>
                      <td className="num">{formatDate(event.date, { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td><span className="badge badge-cat">{categoryMeta(event.category).label}</span></td>
                      <td>
                        <span className="num">{event.bookedCount}/{event.capacity}</span>
                        <div className={s.bar} aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
                      </td>
                      <td className={`${s.revenue} num`}>{formatPrice(event.revenue ?? 0)}</td>
                      <td>
                        <span className={`badge ${event.status === "published" ? (past ? "" : "badge-success") : event.status === "draft" ? "badge-warning" : "badge-danger"}`}>
                          {event.status === "published" && past ? "Ended" : event.status}
                        </span>
                      </td>
                      <td>
                        <div className={s.actions}>
                          <Link href={`/dashboard/${event._id}/attendees`} className="btn btn-ghost btn-sm">
                            <Users size={14} aria-hidden="true" /> Attendees
                          </Link>
                          <Link href={`/dashboard/${event._id}/edit`} className="btn btn-secondary btn-sm">
                            <Pencil size={14} aria-hidden="true" /> Edit
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
      </div>
    </div>
  );
}
