import type { Metadata } from "next";
import Link from "next/link";
import { SealCheck } from "@phosphor-icons/react/ssr";
import VerifyToggle from "./VerifyToggle";
import ReportQueue from "./ReportQueue";
import { apiFetch } from "@/lib/server";
import { formatDate, formatRupees } from "@/lib/format";
import type { ReportGroup, User } from "@/types";
import s from "./admin.module.css";

export const metadata: Metadata = { title: "Admin" };

type Stats = { users: Record<string, number>; events: Record<string, number>; bookings: number; tickets: number; gmv: number };

// Platform oversight (from the original brief): totals, and verifying hosts so they get a badge
export default async function AdminPage() {
  const [stats, hosts, reports] = await Promise.all([
    apiFetch<Stats>("/admin/stats"),
    apiFetch<User[]>("/admin/hosts"),
    apiFetch<ReportGroup[]>("/admin/reports"),
  ]);
  const tiles = [
    { label: "Gross ticket value", value: formatRupees(stats.gmv) },
    { label: "Tickets sold", value: stats.tickets.toLocaleString("en-IN") },
    { label: "Bookings", value: stats.bookings.toLocaleString("en-IN") },
    { label: "Guests", value: String(stats.users.attendee ?? 0) },
    { label: "Hosts", value: String(stats.users.organizer ?? 0) },
    { label: "Live events", value: String(stats.events.published ?? 0) },
  ];

  return (
    <div className="container">
      <header className={s.head}>
        <p className="tag muted">Admin console</p>
        <h1 className="h1">The whole hive</h1>
      </header>

      <div className={s.tiles}>
        {tiles.map((t) => (
          <div key={t.label} className={s.tile}>
            <span className="tag muted">{t.label}</span>
            <strong>{t.value}</strong>
          </div>
        ))}
      </div>
      <p className="mono small muted">
        Events: {Object.entries(stats.events).map(([k, v]) => `${v} ${k}`).join(", ")}
      </p>

      <section className={s.section} aria-labelledby="reports-title">
        <h2 id="reports-title" className="h2">Reports{reports.length > 0 && ` (${reports.length})`}</h2>
        <p className="muted">Events and questions guests have flagged. Taking an event down refunds everyone who booked.</p>
        <ReportQueue groups={reports} />
      </section>

      <section className={s.section}>
        <h2 className="h2">Hosts</h2>
        <p className="muted">Verified hosts get a badge on every event card, their page and the event page.</p>
        <div className="table-wrap card-flat" style={{ marginTop: 16 }}>
          <table className="table">
            <thead><tr><th>Host</th><th>Email</th><th>City</th><th>Joined</th><th>Verified</th></tr></thead>
            <tbody>
              {hosts.map((h) => (
                <tr key={h._id}>
                  <td>
                    <Link href={`/hosts/${h._id}`} className={s.name}>
                      {h.name}
                      {h.verified && <SealCheck size={16} weight="fill" aria-label="Verified" />}
                    </Link>
                  </td>
                  <td>{h.email}</td>
                  <td>{h.city ?? "-"}</td>
                  <td className="mono small">{formatDate(h.createdAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td><VerifyToggle hostId={h._id} verified={!!h.verified} name={h.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
