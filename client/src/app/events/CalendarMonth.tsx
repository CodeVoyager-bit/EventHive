import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";
import { categoryMeta } from "@/lib/categories";
import { formatTime, TIME_ZONE } from "@/lib/format";
import { qs, type SearchParams } from "@/lib/query";
import type { Event } from "@/types";
import s from "./calendar.module.css";

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d); // YYYY-MM-DD in India
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// A month at a glance: each day shows its events in their category colour; a day opens its list.
export default function CalendarMonth({ month, events, params }: { month: string; events: Event[]; params: SearchParams }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first grid
  const today = dayKey(new Date());
  const byDay = new Map<string, Event[]>();
  for (const e of events) {
    const k = dayKey(new Date(e.date));
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const canGoBack = month > today.slice(0, 7);
  const title = first.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1);

  return (
    <section className={s.wrap} aria-label={`Events in ${title}`}>
      <div className={s.head}>
        <h2 className="h3">{title}</h2>
        <div className={s.nav}>
          {canGoBack ? (
            <Link href={`/events${qs(params, { month: shift(-1) })}`} className="icon-btn" aria-label="Previous month"><CaretLeft size={18} weight="bold" aria-hidden="true" /></Link>
          ) : (
            <span className="icon-btn" aria-hidden="true" style={{ opacity: 0.3 }}><CaretLeft size={18} weight="bold" /></span>
          )}
          <Link href={`/events${qs(params, { month: shift(1) })}`} className="icon-btn" aria-label="Next month"><CaretRight size={18} weight="bold" aria-hidden="true" /></Link>
        </div>
      </div>
      <div className={s.grid} role="grid">
        {WEEKDAYS.map((w) => <div key={w} className={s.weekday} role="columnheader">{w}</div>)}
        {cells.map((d, i) => {
          if (d < 1 || d > days) return <div key={i} className={s.blank} aria-hidden="true" />;
          const key = `${month}-${String(d).padStart(2, "0")}`;
          const list = byDay.get(key) ?? [];
          const past = key < today;
          const content = (
            <>
              <span className={`${s.num} ${key === today ? s.today : ""}`}>{d}</span>
              <span className={s.events}>
                {list.slice(0, 2).map((e) => (
                  <span key={e._id} className={s.chip} data-tone={categoryMeta(e.category).tone}>
                    <span className={s.chipTime}>{formatTime(e.date)}</span> {e.title}
                  </span>
                ))}
                {list.length > 2 && <span className={s.more}>+{list.length - 2} more</span>}
              </span>
              <span className={s.dots} aria-hidden="true">
                {list.slice(0, 4).map((e) => <span key={e._id} className={s.dot} data-tone={categoryMeta(e.category).tone} />)}
              </span>
            </>
          );
          return list.length && !past ? (
            <Link key={i} href={`/events${qs(params, { view: null, month: null, from: key, to: key, page: null })}`} className={`${s.day} ${s.busy}`} role="gridcell" aria-label={`${d} ${title}: ${list.length} ${list.length === 1 ? "event" : "events"}`}>
              {content}
            </Link>
          ) : (
            <div key={i} className={`${s.day} ${past ? s.past : ""}`} role="gridcell" aria-label={`${d} ${title}: no events`}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
