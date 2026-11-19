import type { Metadata } from "next";
import Link from "next/link";
import { CalendarBlank, CalendarX, ClockCounterClockwise, ListBullets, MagnifyingGlass, X } from "@phosphor-icons/react/ssr";
import CalendarMonth from "./CalendarMonth";
import AutoSubmitSelect from "@/components/AutoSubmitSelect";
import EventCard from "@/components/EventCard";
import Pagination from "@/components/Pagination";
import { apiFetchPaged, ApiError, getCity, getSavedIds, getSessionUser } from "@/lib/server";
import { CATEGORY_META } from "@/lib/categories";
import { datePresets } from "@/lib/dates";
import { formatDate, todayInIndia } from "@/lib/format";
import { first, qs, type SearchParams } from "@/lib/query";
import type { Event, Pagination as PaginationInfo } from "@/types";
import s from "./events.module.css";

export const metadata: Metadata = { title: "Explore events" };

const SORTS = [
  { value: "date", label: "Soonest first" },
  { value: "popular", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];
const PRICES = [
  { value: "", label: "Any price" },
  { value: "0", label: "Free" },
  { value: "500", label: "Under ₹500" },
  { value: "1000", label: "Under ₹1,000" },
  { value: "2500", label: "Under ₹2,500" },
];

export default async function EventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const savedCity = await getCity();
  // An explicit ?city= wins; "all" clears it; otherwise use the city picked in the navbar
  const cityParam = first(params.city);
  const city = cityParam === "all" ? "" : cityParam || savedCity;
  const q = first(params.q);
  const category = first(params.category);
  const from = first(params.from);
  const to = first(params.to);
  const maxPrice = first(params.maxPrice);
  const sort = first(params.sort) || "date";
  const today = todayInIndia();
  const showingPast = !!to && !from && to <= today;
  const presets = datePresets();
  // Calendar view shows one month (upcoming events only); its own month picker replaces date filters
  const calendar = first(params.view) === "calendar";
  const thisMonth = today.slice(0, 7);
  const monthParam = first(params.month);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) && monthParam >= thisMonth ? monthParam : thisMonth;
  const [my, mm] = month.split("-").map(Number);
  const monthEnd = `${month}-${String(new Date(Date.UTC(my, mm, 0)).getUTCDate()).padStart(2, "0")}`;

  const [user, savedIds] = await Promise.all([getSessionUser(), getSavedIds()]);
  let items: Event[] = [];
  let pagination: PaginationInfo = { total: 0, page: 1, limit: 12, pages: 0 };
  let problem = "";
  try {
    const query = calendar
      ? qs(params, { limit: 50, city: city || null, from: `${month}-01`, to: monthEnd, view: null, month: null, page: null, sort: null })
      : qs(params, { limit: 12, city: city || null });
    ({ items, pagination } = await apiFetchPaged<Event>(`/events${query}`));
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 400) throw err;
    problem = "Some filters in this link aren't valid, so nothing could be shown."; // bad values typed into the URL
  }

  // Quick filters toggle a preset on and off, keeping everything else
  const quick = [
    { label: "Tonight", on: from === presets.today.from && to === presets.today.to, set: { from: presets.today.from, to: presets.today.to } },
    { label: "This weekend", on: from === presets.weekend.from && to === presets.weekend.to, set: { from: presets.weekend.from, to: presets.weekend.to } },
    { label: "This week", on: from === presets.week.from && to === presets.week.to, set: { from: presets.week.from, to: presets.week.to } },
    { label: "Free", on: maxPrice === "0", set: { maxPrice: "0" } },
    { label: "Under ₹500", on: maxPrice === "500", set: { maxPrice: "500" } },
    { label: "Online", on: city.toLowerCase() === "online", set: { city: "Online" } },
  ]
    .filter((f) => !calendar || !("from" in f.set)) // the calendar has its own dates
    .map((f) => {
      const off = Object.fromEntries(Object.keys(f.set).map((k) => [k, k === "city" ? "all" : null]));
      return { ...f, href: `/events${qs(params, { ...(f.on ? off : f.set), page: null })}` };
    });
  // Everything currently narrowing the list, each removable on its own
  const without = (o: Record<string, string | null>) => `/events${qs(params, { ...o, page: null })}`;
  const active = [
    ...(q ? [{ label: `“${q}”`, href: without({ q: null }) }] : []),
    ...(category ? [{ label: CATEGORY_META[category as keyof typeof CATEGORY_META]?.label ?? category, href: without({ category: null }) }] : []),
    ...(city ? [{ label: city, href: without({ city: "all" }) }] : []),
    ...(maxPrice ? [{ label: PRICES.find((p) => p.value === maxPrice)?.label ?? `Under ₹${maxPrice}`, href: without({ maxPrice: null }) }] : []),
    ...(from || to ? [{ label: from && to && from === to ? formatDate(from, { day: "numeric", month: "short" }) : `${from ? formatDate(from, { day: "numeric", month: "short" }) : "…"} to ${to ? formatDate(to, { day: "numeric", month: "short" }) : "…"}`, href: without({ from: null, to: null }) }] : []),
  ];

  return (
    <div className="container">
      <header className={s.head}>
        <h1 className="h1">{showingPast ? "Past events" : city && city.toLowerCase() !== "online" ? `Explore ${city}` : "Explore"}</h1>
        <nav className={s.viewToggle} aria-label="View">
          <Link href={`/events${qs(params, { view: null, month: null })}`} aria-current={!calendar ? "page" : undefined}>
            <ListBullets size={16} weight="bold" aria-hidden="true" /> List
          </Link>
          <Link href={`/events${qs(params, { view: "calendar", from: null, to: null, page: null })}`} aria-current={calendar ? "page" : undefined}>
            <CalendarBlank size={16} weight="bold" aria-hidden="true" /> Calendar
          </Link>
        </nav>
        {!problem && !calendar && (
          <p className="mono">
            {pagination.total} {pagination.total === 1 ? "event" : "events"}
            {q && <> matching “{q}”</>}
          </p>
        )}
      </header>

      {/* Category stories: one stamp per scene */}
      <nav className={s.stories} aria-label="Categories">
        <Link href={`/events${qs(params, { category: null, page: null })}`} className={s.story} aria-current={!category ? "true" : undefined} data-tone="hive">
          <span className={s.storyIcon} aria-hidden="true">All</span>
          <span>Everything</span>
        </Link>
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <Link key={key} href={`/events${qs(params, { category: category === key ? null : key, page: null })}`} className={s.story} aria-current={category === key ? "true" : undefined} data-tone={meta.tone}>
            <span className={s.storyIcon} aria-hidden="true">
              <meta.icon size={26} weight="bold" />
            </span>
            <span>{meta.label}</span>
          </Link>
        ))}
      </nav>

      <form key={qs(params)} className={s.filters} action="/events" method="get">
        <label className={s.searchBox}>
          <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
          <span className="sr-only">Search events</span>
          <input name="q" type="search" placeholder="Search events, venues, topics" defaultValue={q} autoComplete="off" spellCheck={false} enterKeyHint="search" />
        </label>
        <label className={s.field}>
          <span className="sr-only">Price</span>
          <AutoSubmitSelect name="maxPrice" defaultValue={maxPrice} className="input">
            {PRICES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </AutoSubmitSelect>
        </label>
        {!calendar && (
          <label className={s.field}>
            <span className="sr-only">Sort</span>
            <AutoSubmitSelect name="sort" defaultValue={sort} className="input">
              {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </AutoSubmitSelect>
          </label>
        )}
        {calendar && <input type="hidden" name="view" value="calendar" />}
        {calendar && <input type="hidden" name="month" value={month} />}
        {category && <input type="hidden" name="category" value={category} />}
        {cityParam && <input type="hidden" name="city" value={cityParam} />}
        {from && <input type="hidden" name="from" value={from} />}
        {to && <input type="hidden" name="to" value={to} />}
        <button type="submit" className="sr-only">Search</button>
      </form>

      <div className={s.quick}>
        {quick.map((f) => (
          <Link key={f.label} href={f.href} className="chip" aria-pressed={f.on}>
            {f.label}
          </Link>
        ))}
        {!calendar && (
          <>
        <details className={s.dates}>
          <summary className="chip">
            <CalendarBlank size={15} weight="bold" aria-hidden="true" /> Pick dates
          </summary>
          <form className={s.datePanel} action="/events" method="get">
            {Object.entries(params).filter(([k, v]) => !["from", "to", "page"].includes(k) && typeof v === "string" && v).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v as string} />
            ))}
            <label className="field">
              <span className="label">From</span>
              <input type="date" name="from" defaultValue={from} className="input" />
            </label>
            <label className="field">
              <span className="label">To</span>
              <input type="date" name="to" defaultValue={to} className="input" />
            </label>
            <button type="submit" className="btn btn-ink btn-sm">Show events</button>
          </form>
        </details>
        <Link href={`/events${qs(params, { from: null, to: today, page: null })}`} className="chip" aria-pressed={showingPast}>
          <ClockCounterClockwise size={15} weight="bold" aria-hidden="true" /> Past
        </Link>
          </>
        )}
      </div>

      {active.length > 0 && (
        <div className={s.active} aria-label="Active filters">
          {active.map((a) => (
            <Link key={a.label} href={a.href} className={s.activeChip} aria-label={`Remove filter: ${a.label}`}>
              {a.label} <X size={13} weight="bold" aria-hidden="true" />
            </Link>
          ))}
          <Link href="/events?city=all" className="text-link">Clear all</Link>
        </div>
      )}

      {problem ? (
        <div className="empty">
          <span className="empty-art"><CalendarX size={32} weight="bold" aria-hidden="true" /></span>
          <h2 className="h3">Those filters are not valid</h2>
          <p>{problem}</p>
          <Link href="/events?city=all" className="btn btn-secondary">Clear filters</Link>
        </div>
      ) : calendar ? (
        <CalendarMonth month={month} events={items} params={params} />
      ) : items.length === 0 ? (
        <div className="empty">
          <span className="empty-art"><CalendarX size={32} weight="bold" aria-hidden="true" /></span>
          <h2 className="h3">Nothing on with those filters</h2>
          <p>{city ? `Try another city, or widen the dates. ` : ""}Hosts add new events every week.</p>
          <Link href="/events?city=all" className="btn btn-secondary">See everything</Link>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Results</h2>
          <div className="grid-cards">
            {items.map((event, i) => (
              <EventCard key={event._id} event={event} priority={i === 0} eager={i < 3} saved={savedIds.has(event._id)} signedIn={!!user} />
            ))}
          </div>
          <Pagination pagination={pagination} params={params} basePath="/events" />
        </>
      )}
    </div>
  );
}
