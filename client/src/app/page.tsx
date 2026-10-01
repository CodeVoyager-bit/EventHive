import Link from "next/link";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import EventCard from "@/components/EventCard";
import { apiFetchPaged } from "@/lib/server";
import { CATEGORY_META, catStyle } from "@/lib/categories";
import type { Event } from "@/types";
import s from "./home.module.css";

export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = await apiFetchPaged<Event>(`/events?from=${today}&limit=6`)
    .then((r) => r.items)
    .catch(() => null); // API unreachable: the page still renders

  return (
    <>
      <section className={s.hero}>
        <div className="container">
          <div className={s.pill}>
            <span className={s.dot} aria-hidden="true" />
            Live now — find events near you
          </div>
          <h1 className={`h1 ${s.title}`}>
            Find your next <span className="gradient-text">unforgettable</span> event
          </h1>
          <p className={`lead ${s.lead}`}>
            Concerts, meetups, workshops, and more. Discover what is happening and book a seat in seconds.
          </p>
          <form className={s.search} action="/events" method="get" role="search">
            <label className={s.searchInput}>
              <Search size={20} aria-hidden="true" />
              <span className="sr-only">Search events</span>
              <input name="q" type="search" placeholder="Search events, cities, topics…" autoComplete="off" />
            </label>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          <p className={s.quick}>
            Popular: <Link href="/events?category=tech">tech meetups</Link> · <Link href="/events?category=music">live music</Link> ·{" "}
            <Link href="/events?eventType=online">online events</Link>
          </p>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Browse</p>
            <h2 className="h2">By category</h2>
          </div>
        </div>
        <div className={s.cats}>
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <Link key={key} href={`/events?category=${key}`} className={s.cat} style={catStyle(key)}>
              <span className={s.catIcon}>
                <meta.icon size={20} aria-hidden="true" />
              </span>
              <strong>{meta.label}</strong>
              <span>Browse events</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Coming up</p>
            <h2 className="h2">Upcoming events</h2>
          </div>
          <Link href="/events" className="btn btn-secondary">
            View all <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {upcoming === null ? (
          <div className="empty">
            <h3 className="h3">Events are unavailable right now</h3>
            <p className="muted">The events service could not be reached. Please try again in a moment.</p>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="empty">
            <Sparkles size={36} aria-hidden="true" />
            <h3 className="h3">No upcoming events yet</h3>
            <p className="muted">Be the first to host one.</p>
            <Link href="/auth/register" className="btn btn-primary">Become an organizer</Link>
          </div>
        ) : (
          <div className="grid-cards">
            {upcoming.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section className="container" style={{ paddingBottom: 40 }}>
        <div className={s.cta}>
          <h2>Ready to host your own event?</h2>
          <p>Create an event in minutes, sell general and VIP tickets, and see your attendees and revenue in one dashboard.</p>
          <Link href="/auth/register" className={`btn btn-lg ${s.ctaBtn}`}>
            Start organizing <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
