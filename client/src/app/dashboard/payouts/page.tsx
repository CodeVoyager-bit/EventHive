import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bank } from "@phosphor-icons/react/ssr";
import { apiFetch } from "@/lib/server";
import { categoryMeta } from "@/lib/categories";
import { formatDate, formatMoney, formatRupees, plural } from "@/lib/format";
import type { PayoutStatus, Payouts } from "@/types";
import s from "../dashboard.module.css";
import p from "./payouts.module.css";

export const metadata: Metadata = { title: "Payouts" };

const STATUS: Record<PayoutStatus, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "badge-success" },
  scheduled: { label: "On the way", cls: "" },
  upcoming: { label: "Held until the event", cls: "badge-quiet" },
  cancelled: { label: "Cancelled, refunded", cls: "badge-danger" },
};
const day = (iso: string) => formatDate(iso, { day: "numeric", month: "short" });

// What each event pays the host, and when. Money is held until the event has happened.
export default async function PayoutsPage() {
  const { delayDays, summary, events } = await apiFetch<Payouts>("/events/my/payouts");
  const covered = events.reduce((n, e) => n + e.fees, 0);
  const kpis = [
    { label: "Paid out", value: formatRupees(summary.paid), sub: "To your bank account" },
    {
      label: "On the way",
      value: formatRupees(summary.scheduled),
      sub: summary.next ? `Next: ${formatRupees(summary.next.amount)} on ${day(summary.next.date)}` : "Nothing in transit",
    },
    { label: "Expected", value: formatRupees(summary.upcoming), sub: "From events still to happen" },
    { label: "Fees you covered", value: formatRupees(covered), sub: "On events where guests pay no fees" },
  ];

  return (
    <div className="container">
      <Link href="/dashboard" className={s.back}>
        <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Dashboard
      </Link>
      <header className={s.head}>
        <div>
          <p className="tag muted">Host dashboard</p>
          <h1 className="h1">Payouts</h1>
          <p className="muted">
            Ticket money is held until your event has happened, then paid to your bank {delayDays} days later. Fees you chose to cover come out first. Payments are simulated in this demo.
          </p>
        </div>
      </header>

      <div className={s.kpis}>
        {kpis.map((k, i) => (
          <div key={k.label} className={`rise ${s.kpi}`} style={{ "--i": i } as CSSProperties}>
            <span className="tag muted">{k.label}</span>
            <strong className={s.kpiValue}>{k.value}</strong>
            <span className="small muted">{k.sub}</span>
          </div>
        ))}
      </div>

      <section className={s.eventsSection} aria-labelledby="by-event">
        <div className={s.sectionHead}>
          <h2 id="by-event" className="h2">By event</h2>
          <span className="mono muted">{plural(events.length, "event")}</span>
        </div>
        {events.length === 0 ? (
          <div className="empty">
            <span className="empty-art"><Bank size={32} weight="bold" aria-hidden="true" /></span>
            <h3 className="h3">No payouts yet</h3>
            <p>Publish an event and sell some tickets. Each event&apos;s payout shows up here.</p>
            <Link href="/dashboard/create" className="btn btn-primary">Create event</Link>
          </div>
        ) : (
          <ul className={s.rows}>
            {events.map((e) => {
              const st = STATUS[e.status];
              const when =
                e.status === "paid" ? `Paid ${day(e.payoutDate!)} · ${e.reference}`
                : e.status === "scheduled" ? `Arrives ${day(e.payoutDate!)}`
                : e.status === "upcoming" ? `Pays out ${day(e.payoutDate!)}`
                : "Nothing to pay";
              return (
                <li key={e._id} className={`${s.row} ${p.row}`} data-tone={categoryMeta(e.category).tone}>
                  <span className={s.rowStamp} aria-hidden="true">
                    <span>{formatDate(e.date, { month: "short" })}</span>
                    <strong>{formatDate(e.date, { day: "numeric" })}</strong>
                  </span>
                  <div className={s.rowMain}>
                    <Link href={`/dashboard/${e._id}`} className={`${s.rowTitle} ${p.title}`}>{e.title}</Link>
                    <span className="small muted">
                      {plural(e.tickets, "ticket")} · {formatMoney(e.sales)} in sales
                      {e.fees > 0 && <> · {formatMoney(e.fees)} fees covered</>}
                      {e.kept > 0 && <> · {formatMoney(e.kept)} kept from cancellations</>}
                    </span>
                  </div>
                  <div className={`${s.rowNums} ${p.nums}`}>
                    <strong className="mono">{formatMoney(e.payout)}</strong>
                    <span className="mono muted small">{when}</span>
                  </div>
                  <div className={s.rowBadges}>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
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
