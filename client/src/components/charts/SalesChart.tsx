"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import type { DailyPoint } from "@/types";
import s from "./SalesChart.module.css";

type Metric = "tickets" | "revenue";
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 52 };

// Gridlines at a friendly whole step (1, 2 or 5 x 10^n), about four of them
function niceTicks(max: number) {
  const raw = Math.max(max, 1) / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, ([1, 2, 5, 10].find((m) => m * p >= raw) ?? 10) * p);
  const top = Math.max(step, Math.ceil(max / step) * step);
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}
const compactInr = (n: number) => (n >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : `₹${n}`);

// Daily sales as a single-series bar chart: one ink, hairline grid, a tooltip per bar on hover
// or keyboard focus, and the same numbers as a table for screen readers and copying.
export default function SalesChart({ data, title }: { data: DailyPoint[]; title: string }) {
  const id = useId();
  const [metric, setMetric] = useState<Metric>("tickets");
  const [active, setActive] = useState<number | null>(null);
  // Draw at the real width so axis text stays 10px whatever the column size
  const plot = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = plot.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(320, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const values = data.map((d) => (metric === "tickets" ? d.tickets : d.revenue));
  const ticks = niceTicks(Math.max(...values, 0));
  const max = ticks[ticks.length - 1];
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(data.length, 1);
  const barW = Math.min(24, slot * 0.62);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const fmt = (v: number) => (metric === "tickets" ? String(v) : formatMoney(v));
  const total = values.reduce((a, b) => a + b, 0);
  const point = active !== null ? data[active] : null;

  return (
    <figure className={s.figure} aria-labelledby={`${id}-title`}>
      <div className={s.head}>
        <figcaption id={`${id}-title`} className={s.title}>
          {title}
          <span className="mono">{metric === "tickets" ? `${total} tickets` : formatMoney(total)} in {data.length} days</span>
        </figcaption>
        <div className={s.toggle} role="group" aria-label="Measure">
          <button type="button" className="chip" aria-pressed={metric === "tickets"} onClick={() => setMetric("tickets")}>Tickets</button>
          <button type="button" className="chip" aria-pressed={metric === "revenue"} onClick={() => setMetric("revenue")}>Revenue</button>
        </div>
      </div>

      <div className={s.plot} ref={plot}>
        <svg viewBox={`0 0 ${W} ${H}`} className={s.svg} role="group" aria-label={`${title}, ${metric} per day`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className={t === 0 ? s.base : s.grid} />
              <text x={PAD.left - 8} y={y(t) + 4} className={s.axis} textAnchor="end">
                {metric === "tickets" ? t : compactInr(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const v = values[i];
            const x = PAD.left + i * slot + (slot - barW) / 2;
            const top = y(v);
            const h = PAD.top + innerH - top;
            const r = Math.min(4, h); // rounded at the data end only
            return (
              <g
                key={d.date}
                tabIndex={0}
                role="img"
                aria-label={`${formatDate(d.date, { day: "numeric", month: "short" })}: ${fmt(v)}`}
                className={s.mark}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} className={s.hit} />
                {v > 0 && (
                  <path
                    className={`${s.bar} ${active === i ? s.on : ""}`}
                    d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`}
                  />
                )}
                {(i % (W < 560 ? 7 : 5) === 0 || i === data.length - 1) && (
                  <text x={x + barW / 2} y={H - 6} className={s.axis} textAnchor="middle">
                    {formatDate(d.date, { day: "numeric", month: "short" })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {point && active !== null && (
          <div
            className={s.tip}
            style={{ left: `${((PAD.left + active * slot + slot / 2) / W) * 100}%`, top: `${(y(values[active]) / H) * 100}%` }}
            aria-hidden="true"
          >
            <strong>{formatDate(point.date, { weekday: "short", day: "numeric", month: "short" })}</strong>
            <span>{point.tickets} tickets · {point.bookings} bookings</span>
            <span>{formatMoney(point.revenue)}</span>
          </div>
        )}
      </div>

      <details className={s.tableTwin}>
        <summary>Show as a table</summary>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Day</th><th>Bookings</th><th>Tickets</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {data.filter((d) => d.bookings > 0).map((d) => (
                <tr key={d.date}>
                  <td>{formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="mono">{d.bookings}</td>
                  <td className="mono">{d.tickets}</td>
                  <td className="mono">{formatMoney(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
