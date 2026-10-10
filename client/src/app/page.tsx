import { ViewTransition, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MagnifyingGlass, Sparkle } from "@phosphor-icons/react/ssr";
import EventCard from "@/components/EventCard";
import { apiFetchPaged, getSessionUser } from "@/lib/server";
import { CATEGORY_META, categoryMeta, type Tone } from "@/lib/categories";
import { formatPrice } from "@/lib/format";
import type { Event } from "@/types";
import s from "./home.module.css";

const vars = (v: Record<string, string | number>) => v as CSSProperties;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// Rotating hero word; the first word repeats at the end so the loop is seamless
const WORDS: { text: string; tone: Tone }[] = [
  { text: "more.", tone: "pink" },
  { text: "tonight.", tone: "yellow" },
  { text: "louder.", tone: "blue" },
  { text: "together.", tone: "lime" },
  { text: "more.", tone: "pink" },
];
const TONES: Tone[] = ["pink", "orange", "yellow", "lime", "teal", "blue", "violet"];

export default async function HomePage() {
  const [events, user] = await Promise.all([
    apiFetchPaged<Event>("/events?limit=50")
      .then((r) => r.items)
      .catch(() => null), // API unreachable: the page still renders
    getSessionUser(),
  ]);
  const upcoming = events ?? [];
  const deck = upcoming.slice(0, 3); // hero: the next three events, as tickets
  const comingUp = upcoming.slice(3, 9); // distinct from the deck, so shared-element names stay unique
  const counts: Record<string, number> = {};
  for (const e of upcoming) counts[e.category] = (counts[e.category] ?? 0) + 1;
  const cities = new Set(upcoming.filter((e) => e.eventType === "venue").map((e) => e.location)).size;
  const stats = [
    { n: upcoming.length, label: "upcoming events", tone: "pink" },
    { n: cities, label: cities === 1 ? "city" : "cities", tone: "blue" },
    { n: Object.keys(counts).length, label: "categories", tone: "lime" },
    { n: upcoming.filter((e) => e.price === 0).length, label: "free to attend", tone: "orange" },
  ];
  const showHost = user?.role !== "attendee";
  const hostHref = user ? "/dashboard/create" : "/auth/register";
  const marqueeA = upcoming.length ? upcoming.map((e) => e.title) : ["Live music", "Meetups", "Workshops", "Supper clubs"];
  const marqueeB = Object.values(CATEGORY_META).map((m) => m.label);

  return (
    <>
      <div className={s.progress} aria-hidden="true" />

      {/* ---------- Hero ---------- */}
      <section className={s.hero} data-spotlight>
        <span className={s.glow} aria-hidden="true" />
        <div className={`container ${s.heroGrid}`}>
          <div className={s.copy}>
            <h1 className={`display ${s.title}`}>
              <span className="sr-only">Go out more.</span>
              <span aria-hidden="true">
                <span className={s.line}>
                  {"Go out".split("").map((ch, i) => (
                    <span key={i} className={s.ch} style={vars({ "--i": i })}>
                      {ch === " " ? " " : ch}
                    </span>
                  ))}
                </span>
                <span className={s.line}>
                  <span className={s.rotator}>
                    <span className={s.words}>
                      {WORDS.map((w, i) => (
                        <span key={i} className={s.word}>
                          <span className={s.hl} data-tone={w.tone}>{w.text}</span>
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
              </span>
            </h1>
            <p className={`lead ${s.heroRise} ${s.lead}`} style={vars({ "--i": 3 })}>
              Concerts, meetups, workshops and supper clubs near you. Pick a seat and get your ticket in seconds.
            </p>
            <form className={`${s.heroRise} ${s.search}`} style={vars({ "--i": 4 })} action="/events" method="get" role="search">
              <MagnifyingGlass size={20} aria-hidden="true" />
              <label className="sr-only" htmlFor="hero-q">Search events</label>
              <input id="hero-q" name="q" type="search" placeholder="Search events, cities, topics…" autoComplete="off" spellCheck={false} />
              <button type="submit" className="btn btn-primary" data-magnetic>Search</button>
            </form>
          </div>

          {deck.length > 0 && (
            <div className={s.deckWrap}>
              <div className={s.shapes} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className={s.deck} data-tilt>
                {deck.map((event, i) => (
                  <DeckTicket key={event._id} event={event} i={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Crossing marquee bands (decorative; the same content is linked below) ---------- */}
      <section className={s.marquee} aria-hidden="true">
        <div className={`${s.band} ${s.bandA}`}>
          <div className={s.track}>
            {[0, 1].map((copy) => (
              <div key={copy} className={s.run}>
                {marqueeA.map((t, i) => (
                  <span key={i} className={s.item} data-tone={TONES[i % TONES.length]}>
                    {t}
                    <Sparkle size={34} weight="fill" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className={`${s.band} ${s.bandB}`}>
          <div className={s.track}>
            {[0, 1].map((copy) => (
              <div key={copy} className={s.run}>
                {marqueeB.map((t, i) => (
                  <span key={i} className={s.item}>
                    {t}
                    <Sparkle size={30} weight="fill" />
                  </span>
                ))}
              </div>
            ))}
          </div>
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

      {/* ---------- Count-up stats ---------- */}
      {upcoming.length > 0 && (
        <section className={`container ${s.statsSection}`} aria-label="EventHive in numbers">
          <ul className={s.stats}>
            {stats.map((st) => (
              <li key={st.label} className={s.stat} data-tone={st.tone}>
                <span className="sr-only">{st.n} {st.label}</span>
                <span className={s.count} style={vars({ "--to": st.n })} aria-hidden="true" />
                <span className={s.statLabel} aria-hidden="true">{st.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Coming up: vertical scroll pans the row sideways ---------- */}
      {comingUp.length > 0 && (
        <section className={s.pan} aria-labelledby="coming-up">
          <div className={s.panSticky}>
            <div className={`container ${s.panHead}`}>
              <h2 id="coming-up" className={`display ${s.panTitle}`}>Coming up</h2>
              <Link href="/events" className="text-link">
                All events <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className={s.panScroller}>
              <ul className={s.panTrack}>
                {comingUp.map((event) => (
                  <li key={event._id} className={s.panItem}>
                    <EventCard event={event} />
                  </li>
                ))}
                <li className={s.panItem}>
                  <Link href="/events" className={s.panEnd}>
                    <span className="display">See every event</span>
                    <ArrowUpRight size={40} aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            </div>
            <div className={`container ${s.panBarWrap}`} aria-hidden="true">
              <span className={s.panBar} />
            </div>
          </div>
        </section>
      )}

      {/* ---------- Categories ---------- */}
      <section id="categories" className={`container section ${s.anchor}`}>
        <h2 className={`h2 ${s.catHeading}`}>Browse by category</h2>
        <ul className={s.cats}>
          {Object.entries(CATEGORY_META).map(([key, meta], i) => (
            <li key={key} className={s.catItem} style={vars({ "--dir": i % 2 ? 1 : -1 })}>
              <Link href={`/events?category=${key}`} className={s.cat} data-tone={meta.tone} data-spotlight>
                <Image className={s.peek} src={meta.image.replace("w=1200", "w=480")} alt="" width={300} height={200} sizes="300px" />
                <span className={s.catIcon} aria-hidden="true">
                  <meta.icon size={26} weight="bold" />
                </span>
                <span className={s.catName}>{meta.label}</span>
                <span className={`${s.catCount} num`}>{counts[key] ? `${counts[key]} upcoming` : "Nothing scheduled"}</span>
                <ArrowUpRight className={s.catArrow} size={28} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Host band: a big ticket with a tear-off stub ---------- */}
      {showHost && (
        <section id="host" className={`container ${s.anchor}`}>
          <div className={`${s.host} reveal`} data-tilt>
            <div className={`${s.hostMain} notch-r`}>
              <span className={s.shine} aria-hidden="true" />
              <h2 className={`display ${s.hostTitle}`}>Hosting something?</h2>
              <p>Publish an event in minutes, sell general and VIP tickets, and watch bookings land in your dashboard.</p>
            </div>
            <div className={`${s.hostStub} notch-l`}>
              <Link href={hostHref} className={`btn btn-lg ${s.hostBtn}`} data-magnetic>
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
  const meta = categoryMeta(event.category);
  return (
    <Link href={`/events/${event._id}`} className={s.tix} style={vars({ "--i": i })} data-tone={meta.tone}>
      <ViewTransition name={`ev-${event._id}`} share="morph" default="none">
        <div className={`${s.tixMedia} notch-b`}>
          {event.imageUrl ? (
            <Image src={event.imageUrl} alt="" fill sizes="280px" priority={i === 1} />
          ) : (
            <span className={s.tixPlaceholder}>
              <meta.icon size={40} weight="duotone" aria-hidden="true" />
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
