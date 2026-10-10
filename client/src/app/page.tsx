import { ViewTransition, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Globe, MagnifyingGlass, MapPin, Sparkle } from "@phosphor-icons/react/ssr";
import EventCard from "@/components/EventCard";
import { apiFetchPaged, getSessionUser } from "@/lib/server";
import { CATEGORY_META, categoryMeta } from "@/lib/categories";
import { formatPrice, formatTime } from "@/lib/format";
import type { Event } from "@/types";
import s from "./home.module.css";

const order = (i: number) => ({ "--i": i }) as CSSProperties;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export default async function HomePage() {
  const [events, user] = await Promise.all([
    apiFetchPaged<Event>("/events?limit=50")
      .then((r) => r.items)
      .catch(() => null), // API unreachable: the page still renders
    getSessionUser(),
  ]);
  const upcoming = events ?? [];
  const deck = upcoming.slice(0, 3); // hero: the next three events, as tickets
  const comingUp = upcoming.slice(3, 8); // distinct from the deck, so shared-element names stay unique
  const counts: Record<string, number> = {};
  for (const e of upcoming) counts[e.category] = (counts[e.category] ?? 0) + 1;
  const showHost = user?.role !== "attendee";
  const hostHref = user ? "/dashboard/create" : "/auth/register";

  return (
    <>
      <section className={s.hero}>
        <div className={`container ${s.heroGrid}`}>
          <div className={s.copy}>
            <h1 className={`display ${s.title}`}>
              <span className={s.line}>
                <span style={order(0)}>Go out</span>
              </span>
              <span className={s.line}>
                <span className="accent" style={order(1)}>more.</span>
              </span>
            </h1>
            <p className={`lead ${s.heroRise} ${s.lead}`} style={order(3)}>
              Concerts, meetups, workshops and supper clubs near you. Pick a seat and get your ticket in seconds.
            </p>
            <form className={`${s.heroRise} ${s.search}`} style={order(4)} action="/events" method="get" role="search">
              <MagnifyingGlass size={20} aria-hidden="true" />
              <label className="sr-only" htmlFor="hero-q">Search events</label>
              <input id="hero-q" name="q" type="search" placeholder="Search events, cities, topics…" autoComplete="off" spellCheck={false} />
              <button type="submit" className="btn btn-primary">Search</button>
            </form>
          </div>

          {deck.length > 0 && (
            <div className={s.deckWrap}>
              <div className={s.deck} data-tilt>
                {deck.map((event, i) => (
                  <DeckTicket key={event._id} event={event} i={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {events === null && (
        <section className="container section">
          <div className="empty">
            <h2 className="h3">Events are unavailable right now</h2>
            <p className="muted">The events service could not be reached. Please try again in a moment.</p>
          </div>
        </section>
      )}

      {events !== null && upcoming.length === 0 && (
        <section className="container section">
          <div className="empty">
            <Sparkle size={36} weight="duotone" aria-hidden="true" />
            <h2 className="h3">No upcoming events yet</h2>
            <p className="muted">Be the first to host one.</p>
            <Link href="/auth/register" className="btn btn-primary">Start Hosting</Link>
          </div>
        </section>
      )}

      {comingUp.length > 0 && (
        <section className="container section">
          <div className="section-head">
            <h2 className="h2">Coming up</h2>
            <Link href="/events" className="text-link">
              All events <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={s.bento} data-count={comingUp.length}>
            <FeatureTile event={comingUp[0]} />
            {comingUp.slice(1).map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        </section>
      )}

      <section className="container section">
        <h2 className={`h2 ${s.catHeading}`}>Browse by category</h2>
        <ul className={s.cats}>
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <li key={key} className="reveal">
              <Link href={`/events?category=${key}`} className={s.cat} data-spotlight>
                <Image className={s.peek} src={meta.image.replace("w=1200", "w=480")} alt="" width={300} height={200} sizes="300px" />
                <span className={s.catName}>{meta.label}</span>
                <span className={`${s.catCount} num`}>{counts[key] ? `${counts[key]} upcoming` : "Nothing scheduled"}</span>
                <ArrowUpRight className={s.catArrow} size={28} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {showHost && (
        <section className="container">
          <div className={`${s.host} reveal`}>
            <div className={`${s.hostMain} notch-r`}>
              <h2 className={`display ${s.hostTitle}`}>Hosting something?</h2>
              <p>Publish an event in minutes, sell general and VIP tickets, and watch bookings land in your dashboard.</p>
            </div>
            <div className={`${s.hostStub} notch-l`}>
              <Link href={hostHref} className={`btn btn-lg ${s.hostBtn}`}>
                Start Hosting <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function DeckTicket({ event, i }: { event: Event; i: number }) {
  const Icon = categoryMeta(event.category).icon;
  return (
    <Link href={`/events/${event._id}`} className={s.tix} style={order(i)}>
      <ViewTransition name={`ev-${event._id}`} share="morph">
        <div className={`${s.tixMedia} notch-b`}>
          {event.imageUrl ? (
            <Image src={event.imageUrl} alt="" fill sizes="280px" priority={i === 1} />
          ) : (
            <span className={s.tixPlaceholder}>
              <Icon size={40} weight="duotone" aria-hidden="true" />
            </span>
          )}
        </div>
      </ViewTransition>
      <div className={`${s.tixStub} notch-t perf-t`}>
        <span className={s.tixDate}>{shortDate(event.date)}</span>
        <strong className={s.tixTitle}>{event.title}</strong>
        <span className={s.tixMeta}>
          <span>{event.location}</span>
          <span className="num">{formatPrice(event.price)}</span>
        </span>
        <span className={`mono ${s.admit}`} aria-hidden="true">ADMIT ONE</span>
      </div>
    </Link>
  );
}

function FeatureTile({ event }: { event: Event }) {
  const meta = categoryMeta(event.category);
  return (
    <Link href={`/events/${event._id}`} className={`${s.feature} reveal`} data-spotlight>
      <ViewTransition name={`ev-${event._id}`} share="morph">
        <div className={s.featureMedia}>
          {event.imageUrl ? (
            <Image src={event.imageUrl} alt="" fill sizes="(max-width: 900px) 100vw, 620px" />
          ) : (
            <span className={s.tixPlaceholder}>
              <meta.icon size={56} weight="duotone" aria-hidden="true" />
            </span>
          )}
        </div>
      </ViewTransition>
      <div className={s.featureBody}>
        <span className={s.featureDate}>
          {shortDate(event.date)} · {formatTime(event.date)}
        </span>
        <h3 className={`display ${s.featureTitle}`}>{event.title}</h3>
        <div className={`${s.featureFoot} perf-t`}>
          <span className={s.featureMeta}>
            {event.eventType === "online" ? <Globe size={16} aria-hidden="true" /> : <MapPin size={16} aria-hidden="true" />}
            {event.location}
          </span>
          <span className={`${s.featurePrice} num`}>{formatPrice(event.price)}</span>
        </div>
      </div>
    </Link>
  );
}
