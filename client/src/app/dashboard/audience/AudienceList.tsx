"use client";

import { useState } from "react";
import { DownloadSimple, Heart, MagnifyingGlass, Repeat, UsersThree } from "@phosphor-icons/react";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatMoney, initials, plural } from "@/lib/format";
import type { Audience } from "@/types";
import s from "./audience.module.css";

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "regulars", label: "Regulars" },
  { key: "followers", label: "Follow you" },
  { key: "once", label: "Came once" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

export default function AudienceList({ people }: { people: Audience["people"] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const match = (p: Audience["people"][number]) =>
    (filter === "all" || (filter === "regulars" && p.events >= 2) || (filter === "followers" && p.follows) || (filter === "once" && p.events === 1)) &&
    (!q || `${p.name} ${p.email} ${p.city ?? ""}`.toLowerCase().includes(q));
  const shown = people.filter(match);
  const count = (f: Filter) => people.filter((p) => f === "all" || (f === "regulars" && p.events >= 2) || (f === "followers" && p.follows) || (f === "once" && p.events === 1)).length;

  function exportCsv() {
    downloadCsv(
      `audience-${filter}.csv`,
      ["Name", "Email", "City", "Events", "Tickets", "Spent (INR)", "Follows you", "First booked", "Last booked", "Last event"],
      shown.map((p) => [p.name, p.email, p.city ?? "", p.events, p.tickets, p.spent, p.follows ? "yes" : "no", p.first.slice(0, 10), p.last.slice(0, 10), p.lastEvent])
    );
  }

  if (people.length === 0) {
    return (
      <div className="empty">
        <span className="empty-art"><UsersThree size={32} weight="bold" aria-hidden="true" /></span>
        <h2 className="h3">No one yet</h2>
        <p>When people book your events, they show up here.</p>
      </div>
    );
  }
  return (
    <section aria-labelledby="people-title" className={s.wrap}>
      <h2 id="people-title" className="sr-only">People</h2>
      <div className={s.tools}>
        <div className={s.filters} role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label} <span className="mono">{count(f.key)}</span>
            </button>
          ))}
        </div>
        <label className={s.search}>
          <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
          <span className="sr-only">Search people</span>
          <input type="search" placeholder="Name, email or city" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={shown.length === 0}>
          <DownloadSimple size={16} weight="bold" aria-hidden="true" /> Export {shown.length}
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="muted">Nobody matches.</p>
      ) : (
        <ul className={s.people}>
          {shown.map((p) => (
            <li key={p._id} className={s.person}>
              <span className={s.avatar} aria-hidden="true">{initials(p.name)}</span>
              <div className={s.who}>
                <strong>{p.name}</strong>
                <span className="small muted">{p.email}{p.city ? ` · ${p.city}` : ""}</span>
              </div>
              <div className={s.stats}>
                <span className="mono">{plural(p.events, "event")} · {plural(p.tickets, "ticket")}</span>
                <span className="mono small muted">{formatMoney(p.spent)}</span>
              </div>
              <div className={s.last}>
                <span className="small">{p.lastEvent}</span>
                <span className="small muted">Last booked {formatDate(p.last, { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <div className={s.badges}>
                {p.events >= 2 && <span className="badge"><Repeat size={12} weight="bold" aria-hidden="true" /> Regular</span>}
                {p.follows && <span className="badge badge-quiet"><Heart size={12} weight="fill" aria-hidden="true" /> Follows you</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
