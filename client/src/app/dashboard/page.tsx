import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AddressBook, Bank, CalendarPlus, Hourglass, PencilSimple, SquaresFour, Users } from "@phosphor-icons/react/ssr";
import SalesChart from "@/components/charts/SalesChart";
import { apiFetch, getSessionUser } from "@/lib/server";
import { categoryMeta } from "@/lib/categories";
import { formatDate, formatMoney, formatRupees, isPast, plural } from "@/lib/format";
import type { DailyPoint, Event } from "@/types";
import s from "./dashboard.module.css";

export const metadata: Metadata = { title: "Host dashboard" };

const statusOf = (e: Event) =>
  e.status === "cancelled" ? { label: "Cancelled", cls: "badge-danger" } : e.status === "draft" ? { label: "Draft", cls: "badge-quiet" } : isPast(e.date) ? { label: "Ended", cls: "badge-quiet" } : { label: "On sale", cls: "badge-success" };

export default async function DashboardPage() {
  const [events, stats, user] = await Promise.all([
    apiFetch<Event[]>("/events/my/events"),
    apiFetch<{ daily: DailyPoint[]; followers: number }>("/events/my/stats?days=30"),
    getSessionUser(),
  ]);
  const live = events.filter((e) => e.status !== "cancelled");
  const sold = live.reduce((sum, e) => sum + e.bookedCount, 0);
  const revenue = live.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
  const upcoming = live.filter((e) => !isPast(e.date) && e.status === "published").sort((a, b) => a.date.localeCompare(b.date)); // soonest first
  const pending = events.filter((e) => (e.pending ?? 0) > 0);
  const last30 = stats.daily.reduce((n, d) => n + d.revenue, 0);

  const kpis = [
    { label: "Ticket sales", value: formatRupees(revenue), sub: `${formatRupees(last30)} in the last 30 days` },
    { label: "Tickets sold", value: sold.toLocaleString("en-IN"), sub: `across ${plural(live.length, "event")}` },
    { label: "Followers", value: String(stats.followers), sub: "hear about every new event" },
    { label: "On sale", value: String(upcoming.length), sub: upcoming[0] ? `next: ${formatDate(upcoming[0].date)}` : "nothing scheduled" },
  ];

  return (
    <div className="container">
      <header className={s.head}>
        <div>
          <p className="tag muted">Host dashboard</p>
          <h1 className="h1">Hello, {user?.name.split(" ")[0]}</h1>
        </div>
        <div className={s.headActions}>
          <Link href="/dashboard/audience" className="btn btn-secondary">
            <AddressBook size={18} weight="bold" aria-hidden="true" /> Audience
          </Link>
          <Link href="/dashboard/payouts" className="btn btn-secondary">
            <Bank size={18} weight="bold" aria-hidden="true" /> Payouts
          </Link>
          <Link href="/dashboard/create" className="btn btn-primary">
            <CalendarPlus size={18} weight="bold" aria-hidden="true" /> Create event
          </Link>
        </div>
      </header>

      {pending.length > 0 && (
        <div className={s.pendingBar}>
          <Hourglass size={20} weight="bold" aria-hidden="true" />
          <span>
            <strong>{plural(pending.reduce((n, e) => n + (e.pending ?? 0), 0), "request")} waiting for you.</strong> Guests are holding seats until you decide.
          </span>
          {pending.map((e) => (
            <Link key={e._id} href={`/dashboard/${e._id}/attendees`} className="btn btn-ink btn-sm">{e.title} ({e.pending})</Link>
          ))}
        </div>
      )}

      <div className={s.kpis}>
        {kpis.map((k, i) => (
          <div key={k.label} className={`rise ${s.kpi}`} style={{ "--i": i } as React.CSSProperties}>
            <span className="tag muted">{k.label}</span>
            <strong className={s.kpiValue}>{k.value}</strong>
            <span className="small muted">{k.sub}</span>
          </div>
        ))}
      </div>

      <section className={`card card-pad ${s.chartCard}`}>
        <SalesChart data={stats.daily} title="Sales, last 30 days" />
      </section>

      <section className={s.eventsSection} aria-labelledby="my-events">
        <div className={s.sectionHead}>
          <h2 id="my-events" className="h2">Your events</h2>
          <span className="mono muted">{events.length} total</span>
        </div>
        {events.length === 0 ? (
          <div className="empty">
            <span className="empty-art"><SquaresFour size={32} weight="bold" aria-hidden="true" /></span>
            <h3 className="h3">No events yet</h3>
            <p>Create your first event: add ticket tiers, a promo code, and publish when the checklist is green.</p>
            <Link href="/dashboard/create" className="btn btn-primary">Create event</Link>
          </div>
        ) : (
          <ul className={s.rows}>
            {events.map((event) => {
              const meta = categoryMeta(event.category);
              const st = statusOf(event);
              return (
                <li key={event._id} className={s.row} data-tone={meta.tone}>
                  <span className={s.rowStamp} aria-hidden="true">
                    <span>{formatDate(event.date, { month: "short" })}</span>
                    <strong>{formatDate(event.date, { day: "numeric" })}</strong>
                  </span>
                  <div className={s.rowMain}>
                    <Link href={`/dashboard/${event._id}`} className={s.rowTitle}>{event.title}</Link>
                    <span className="small muted">{meta.label} · {event.location} · {plural(event.tiers?.length ?? 1, "tier")}</span>
                  </div>
                  <div className={s.rowNums}>
                    <span className="mono"><strong>{event.bookedCount}</strong>/{event.capacity} sold</span>
                    <span className="mono muted small">{formatMoney(event.revenue ?? 0)}</span>
                  </div>
                  <div className={s.rowBadges}>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {(event.pending ?? 0) > 0 && <span className="badge">{event.pending} pending</span>}
                  </div>
                  <div className={s.rowActions}>
                    <Link href={`/dashboard/${event._id}/attendees`} className="btn btn-ghost btn-sm"><Users size={15} weight="bold" aria-hidden="true" /> Guests</Link>
                    <Link href={`/dashboard/${event._id}/edit`} className="btn btn-secondary btn-sm"><PencilSimple size={15} weight="bold" aria-hidden="true" /> Edit</Link>
                    <Link href={`/dashboard/${event._id}`} className="btn btn-primary btn-sm">Manage <ArrowRight size={14} weight="bold" aria-hidden="true" /></Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
