import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX, History, Search, SlidersHorizontal } from "lucide-react";
import EventCard from "@/components/EventCard";
import Pagination from "@/components/Pagination";
import { apiFetchPaged, ApiError } from "@/lib/server";
import { CATEGORY_META, catStyle } from "@/lib/categories";
import { first, qs, type SearchParams } from "@/lib/query";
import type { Event, Pagination as PaginationInfo } from "@/types";
import s from "./events.module.css";

export const metadata: Metadata = { title: "Explore events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = first(params.q);
  const category = first(params.category);
  const eventType = first(params.eventType);
  const from = first(params.from);
  const to = first(params.to);
  const today = new Date().toISOString().slice(0, 10);

  let items: Event[] = [];
  let pagination: PaginationInfo = { total: 0, page: 1, limit: 12, pages: 0 };
  let problem = "";
  try {
    ({ items, pagination } = await apiFetchPaged<Event>(`/events${qs(params, { limit: 12 })}`));
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 400) throw err;
    problem = err.message; // bad filter values typed into the URL
  }

  const chip = (key: string | null, label: string, icon?: React.ReactNode) => {
    const active = (category || null) === key;
    return (
      <Link
        key={key ?? "all"}
        href={`/events${qs(params, { category: key, page: null })}`}
        className={`${s.chip} ${active ? s.chipActive : ""}`}
        aria-current={active ? "true" : undefined}
        style={key ? catStyle(key) : undefined}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <div className="container section">
      <div className={s.head}>
        <p className="eyebrow">Explore</p>
        <h1 className="h2">Find your next event</h1>
      </div>

      <form className={s.filters} action="/events" method="get">
        <label className={s.searchBox}>
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search events</span>
          <input name="q" type="search" className="input" placeholder="Search events, cities, topics…" defaultValue={q} />
        </label>
        <label className={s.filter}>
          <span className="sr-only">Format</span>
          <select name="eventType" className="input" defaultValue={eventType}>
            <option value="">Any format</option>
            <option value="venue">In person</option>
            <option value="online">Online</option>
          </select>
        </label>
        <label className={s.filter}>
          <span className={s.filterLabel}>From</span>
          <input type="date" name="from" className="input" defaultValue={from} />
        </label>
        <label className={s.filter}>
          <span className={s.filterLabel}>To</span>
          <input type="date" name="to" className="input" defaultValue={to} />
        </label>
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" className="btn btn-primary">
          <SlidersHorizontal size={16} aria-hidden="true" /> Apply
        </button>
      </form>

      <div className={s.chips}>
        {chip(null, "All")}
        {Object.entries(CATEGORY_META).map(([key, meta]) => chip(key, meta.label, <meta.icon size={14} aria-hidden="true" />))}
        <Link href={`/events${qs(params, { from: null, to: today, page: null })}`} className={`${s.chip} ${to && !from ? s.chipActive : ""}`}>
          <History size={14} aria-hidden="true" /> Past events
        </Link>
      </div>

      {problem ? (
        <div className="empty">
          <CalendarX size={36} aria-hidden="true" />
          <h2 className="h3">Those filters are not valid</h2>
          <p className="muted">{problem}</p>
          <Link href="/events" className="btn btn-secondary">Clear filters</Link>
        </div>
      ) : items.length === 0 ? (
        <div className="empty">
          <CalendarX size={36} aria-hidden="true" />
          <h2 className="h3">No events match</h2>
          <p className="muted">Try a different search, category, or date range.</p>
          <Link href="/events" className="btn btn-secondary">Clear filters</Link>
        </div>
      ) : (
        <>
          <p className={`small muted ${s.count}`}>
            {pagination.total} event{pagination.total === 1 ? "" : "s"}
            {q && <> for “{q}”</>}
          </p>
          <div className="grid-cards">
            {items.map((event, i) => (
              <EventCard key={event._id} event={event} priority={i < 3} />
            ))}
          </div>
          <Pagination pagination={pagination} params={params} basePath="/events" />
        </>
      )}
    </div>
  );
}
