import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SalesChart from "@/components/charts/SalesChart";
import Announcements from "./Announcements";
import EventTabs, { BackToEvents } from "./EventTabs";
import DuplicateButton from "./DuplicateButton";
import DangerZone from "./DangerZone";
import CopyLink from "./CopyLink";
import { apiFetch, ApiError } from "@/lib/server";
import { formatDateTime, formatMoney, formatRupees, isPast, plural } from "@/lib/format";
import type { Analytics, Announcement, Event } from "@/types";
import s from "../dashboard.module.css";

export const metadata: Metadata = { title: "Manage event" };

export default async function ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let event: Event, a: Analytics, updates: { items: Announcement[] };
  try {
    [event, a, updates] = await Promise.all([
      apiFetch<Event>(`/events/${id}`),
      apiFetch<Analytics>(`/events/${id}/analytics`),
      apiFetch<{ items: Announcement[] }>(`/events/${id}/announcements`),
    ]);
  } catch (err) {
    if (err instanceof ApiError && [400, 403, 404].includes(err.status)) notFound(); // not yours, or gone
    throw err;
  }
  const past = isPast(event.date);
  const checkRate = a.checkIn.total ? Math.round((a.checkIn.checkedIn / a.checkIn.total) * 100) : 0;
  const kpis = [
    { label: "Ticket sales", value: formatRupees(a.revenue) },
    { label: "Sold", value: `${a.sold}/${a.capacity}` },
    { label: "Page views", value: a.views.toLocaleString("en-IN"), sub: a.conversion === null ? "no views yet" : `${a.conversion}% booked` },
    { label: "Checked in", value: `${checkRate}%`, sub: `${a.checkIn.checkedIn} of ${a.checkIn.total}` },
    { label: "Waitlist", value: String(a.waiting) },
    { label: "Requests", value: String(a.pending) },
  ];

  return (
    <div className="container">
      <BackToEvents />
      <header className={s.head} style={{ paddingBottom: 16 }}>
        <div>
          <p className="tag muted">{formatDateTime(event.date)} · {event.location}</p>
          <h1 className="h1">{event.title}</h1>
        </div>
        <DuplicateButton eventId={id} />
      </header>
      <EventTabs eventId={id} current="overview" pending={a.pending} />
      <div style={{ height: 24 }} />

      {event.status !== "published" && (
        <p className="alert" style={{ marginBottom: 20 }}>
          {event.status === "draft" ? "This event is a draft. Only you can see it. Publish it from Edit when the checklist is complete." : "This event was cancelled. Everyone who booked was refunded and notified."}
        </p>
      )}

      <div className={s.kpis} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        {kpis.map((k) => (
          <div key={k.label} className={s.kpi}>
            <span className="tag muted">{k.label}</span>
            <strong className={s.kpiValue}>{k.value}</strong>
            {k.sub && <span className="small muted">{k.sub}</span>}
          </div>
        ))}
      </div>

      <div className={s.grid2}>
        <section className="card card-pad">
          <SalesChart data={a.daily} title="Sales by day" />
        </section>
        <section className={`card card-pad ${s.panel}`}>
          <h2 className={s.panelTitle}>Ticket tiers</h2>
          {a.tiers.map((t) => (
            <div key={t._id} className={s.tierRow}>
              <div className={s.tierTop}>
                <strong>{t.name} <span className="mono small muted">{t.price === 0 ? "Free" : formatMoney(t.price)}</span></strong>
                <span className="mono small">{t.sold}/{t.capacity}</span>
              </div>
              <div className={s.meter} role="img" aria-label={`${t.name}: ${t.sold} of ${t.capacity} sold`}>
                <span style={{ width: `${Math.min(100, (t.sold / t.capacity) * 100)}%` }} />
              </div>
              <span className="mono small muted">{formatMoney(t.revenue)} in sales</span>
            </div>
          ))}
        </section>
      </div>

      <div className={s.grid2} style={{ marginTop: 24 }}>
        <section className={`card card-pad ${s.panel}`}>
          <h2 className={s.panelTitle}>Updates to ticket holders</h2>
          <Announcements eventId={id} items={updates.items} disabled={past || event.status === "cancelled"} />
        </section>
        <div style={{ display: "grid", gap: 24 }}>
          <section className={`card card-pad ${s.panel}`}>
            <h2 className={s.panelTitle}>Top referrers</h2>
            {a.referrers.length === 0 ? (
              <p className="muted small">When guests share their personal link, the people they bring in show up here.</p>
            ) : (
              <ol className={s.leader}>
                {a.referrers.map((r, i) => (
                  <li key={r.name}>
                    <span className={s.rank}>{i + 1}</span>
                    <strong>{r.name}</strong>
                    <span className="mono small">{plural(r.tickets, "ticket")}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className={`card card-pad ${s.panel}`}>
            <h2 className={s.panelTitle}>Promo codes</h2>
            {a.promos.length === 0 ? (
              <p className="muted small">No codes yet. Add one in Edit; share a link that applies it automatically.</p>
            ) : (
              <ul className={s.list}>
                {a.promos.map((p) => (
                  <li key={p.code} className={s.tierTop}>
                    <span>
                      <strong className="mono">{p.code}</strong>
                      <span className="small muted"> · {p.used}/{p.limit} used</span>
                    </span>
                    <CopyLink path={`/events/${id}?code=${p.code}`} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <DangerZone eventId={id} title={event.title} status={event.status} past={past} hasBookings={a.sold > 0 || a.pending > 0} />
    </div>
  );
}
