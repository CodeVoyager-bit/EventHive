import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowsLeftRight, Hourglass, QrCode, SealCheck, ShieldCheck, Star } from "@phosphor-icons/react/ssr";
import EventCard from "@/components/EventCard";
import Countdown from "@/components/Countdown";
import SurpriseMe from "@/components/SurpriseMe";
import LiveTicketQR from "@/components/LiveTicketQR";
import { apiFetch, apiFetchPaged, getCity, getSavedIds, getSessionUser } from "@/lib/server";
import { CATEGORY_META, categoryMeta } from "@/lib/categories";
import { COLLECTIONS } from "@/lib/collections";
import { datePresets } from "@/lib/dates";
import { formatDate, formatPrice, formatTime, fromPrice, initials, plural } from "@/lib/format";
import type { Category, Event, EventPick, HostCard, PickReason, Review } from "@/types";
import s from "./home.module.css";

const vars = (v: Record<string, string | number>) => v as CSSProperties;
// A fixed secret so the home page can show a real rotating ticket (it admits no one)
const DEMO_SECRET = "5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed";

const FEATURES = [
  { icon: QrCode, title: "A ticket you can't screenshot", body: "Your QR and door code change every 30 seconds, generated on your phone. Touts can't resell a photo." },
  { icon: Hourglass, title: "Sold out isn't the end", body: "Join the waitlist. When someone cancels, the next person in line is booked automatically." },
  { icon: ShieldCheck, title: "Plans change. Refunds don't vanish", body: "Every event states its refund policy up front. Add Refund Protection and cancel any time before doors." },
  { icon: ArrowsLeftRight, title: "Send a ticket to a friend", body: "Transfer it in two taps. Their copy gets a fresh code, so yours stops working." },
];

// Why a pick was chosen, in a few words on the card
const why = (r: PickReason) =>
  r.kind === "host"
    ? `From ${r.name}, who you follow`
    : r.kind === "city"
      ? `Near you in ${r.city}`
      : r.category === "other"
        ? "Like events you've been to"
        : `Because you like ${CATEGORY_META[r.category].label.toLowerCase()}`;

export default async function HomePage() {
  const [events, user, savedIds, city, reviews, hosts, picks] = await Promise.all([
    apiFetchPaged<Event>("/events?limit=50")
      .then((r) => r.items)
      .catch(() => [] as Event[]), // API unreachable: the page still renders
    getSessionUser(),
    getSavedIds(),
    getCity(),
    apiFetch<Review[]>("/reviews/recent?limit=10").catch(() => [] as Review[]),
    apiFetch<HostCard[]>("/hosts?limit=4").catch(() => [] as HostCard[]),
    getSessionUser().then((u) => (u ? apiFetch<EventPick[]>("/me/for-you").catch(() => [] as EventPick[]) : ([] as EventPick[]))),
  ]);

  const posters = events.slice(0, 3);
  const local = city ? events.filter((e) => e.location.toLowerCase() === city.toLowerCase()) : [];
  // Picks sit above this rail, so it skips them (one card per event per page)
  const picked = new Set(picks.map((e) => e._id));
  const rail = (local.length ? local : events).filter((e) => !picked.has(e._id)).slice(0, 10);
  const counts = events.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + 1 }), {});
  const categories = (Object.keys(CATEGORY_META) as Category[]).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  const lists = COLLECTIONS.slice(0, 4).map((c) => ({ ...c, events: events.filter(c.match) }));
  const presets = datePresets();
  const hostHref = user ? "/dashboard/create" : "/auth/register?role=organizer";

  return (
    <>
      {/* ---------- Hero: copy left, the next three events pasted up like posters on a wall ---------- */}
      <section className={s.hero}>
        <div className={`container ${s.heroGrid}`}>
          <div className={s.copy}>
            <h1 className={`display ${s.title}`}>
              <span className="rise" style={vars({ "--i": 0 })}>Leave the</span>{" "}
              <span className="rise" style={vars({ "--i": 1 })}>house</span>{" "}
              <mark className={`stamp ${s.mark}`} style={vars({ "--i": 2 })}>more.</mark>
            </h1>
            <p className={`lead rise ${s.sub}`} style={vars({ "--i": 3 })}>
              Gigs, meetups, runs and supper clubs across India. Book in seconds, walk in with a live ticket.
            </p>
            <div className={`rise ${s.ctas}`} style={vars({ "--i": 4 })}>
              <Link href="/events" className="btn btn-primary btn-lg">
                Explore events <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
              <SurpriseMe events={events.map((e) => ({ id: e._id, title: e.title }))} />
            </div>
          </div>

          <div className={s.wall} aria-label="Coming up next">
            {posters.map((e, i) => {
              const meta = categoryMeta(e.category);
              return (
                <Link key={e._id} href={`/events/${e._id}`} className={`${s.poster} riso-host`} data-tone={meta.tone} style={vars({ "--i": i })}>
                  <div className={`${s.posterImg} riso`}>
                    {e.imageUrl && <Image src={e.imageUrl} alt="" fill sizes="(max-width: 900px) 70vw, 340px" preload={i === 0} loading="eager" />}
                  </div>
                  <div className={s.posterText}>
                    <span className="tag">{formatDate(e.date)} / {formatTime(e.date)}</span>
                    <strong className={s.posterTitle}>{e.title}</strong>
                    <span className={s.posterFoot}>
                      <span>{e.location}</span>
                      <span className="mono">{formatPrice(fromPrice(e))}</span>
                    </span>
                  </div>
                  {i === 0 && (
                    <span className={s.sticker}>
                      <span className="tag">Next up in</span>
                      <Countdown to={e.date} />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Picked for you: hosts you follow, what you book, your city ---------- */}
      {picks.length > 0 && (
        <section className={`section ${s.soon}`} aria-labelledby="picks-title">
          <div className="container">
            <div className="section-head">
              <h2 id="picks-title" className="h2">Picked for you</h2>
              <p className="muted">From hosts you follow, the kinds of night you book, and your city.</p>
            </div>
          </div>
          <div className={s.rail}>
            {picks.map((e) => (
              <div key={e._id} className={s.railItem}>
                <EventCard event={e} note={why(e.reason)} saved={savedIds.has(e._id)} signedIn />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Happening soon: a horizontal rail ---------- */}
      {rail.length > 0 && (
        <section className={`section ${s.soon}`}>
          <div className="container">
            <div className="section-head">
              <h2 className="h2">{local.length ? `Happening in ${city}` : "Happening soon"}</h2>
              <div className={s.quick}>
                <Link className="chip" href={`/events?from=${presets.today.from}&to=${presets.today.to}`}>Tonight</Link>
                <Link className="chip" href={`/events?from=${presets.weekend.from}&to=${presets.weekend.to}`}>This weekend</Link>
                <Link className="chip" href="/events?maxPrice=0">Free</Link>
                <Link className="text-link" href="/events">All events <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            </div>
          </div>
          <div className={s.rail}>
            {rail.map((e, i) => (
              <div key={e._id} className={s.railItem}>
                <EventCard event={e} saved={savedIds.has(e._id)} signedIn={!!user} priority={i < 2} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Categories: a bento of inks, busiest scene biggest ---------- */}
      <section id="categories" className="section">
        <div className="container">
          <h2 className={`h2 ${s.headSpace}`}>Pick your scene</h2>
          <div className={s.bento}>
            {categories.map((key, i) => {
              const meta = CATEGORY_META[key];
              const Icon = meta.icon;
              return (
                <Link key={key} href={`/events?category=${key}`} className={`${s.tile} ${i === 0 ? s.tileBig : ""} riso-host reveal`} data-tone={meta.tone}>
                  {i === 0 && (
                    <div className={`${s.tileImg} riso`}>
                      <Image src={meta.image} alt="" fill sizes="(max-width: 900px) 100vw, 50vw" />
                    </div>
                  )}
                  <Icon size={i === 0 ? 44 : 32} weight="bold" className={s.tileIcon} aria-hidden="true" />
                  <span className={s.tileLabel}>{meta.label}</span>
                  <span className={`mono ${s.tileCount}`}>{plural(counts[key] ?? 0, "event")}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Collections: curated lists ---------- */}
      <section className="section">
        <div className="container">
          <h2 className={`h2 ${s.headSpace}`}>Start with a list</h2>
          <div className={s.lists}>
            {lists.map((c, i) => (
              <Link key={c.slug} href={`/collections/${c.slug}`} className={`${s.list} ${i === 0 ? s.listBig : i === 3 ? s.listWide : ""} reveal`} data-tone={c.tone}>
                <div className={s.listText}>
                  <h3 className={s.listTitle}>{c.title}</h3>
                  <p>{c.blurb}</p>
                  <span className="mono">{plural(c.events.length, "event")}</span>
                </div>
                <div className={s.fan} aria-hidden="true">
                  {c.events
                    .filter((e) => e.imageUrl)
                    .slice(0, 3)
                    .map((e, j) => (
                      <span key={e._id} className={`${s.fanCard} riso`} data-tone={categoryMeta(e.category).tone} style={vars({ "--j": j })}>
                        <Image src={e.imageUrl} alt="" fill sizes="160px" />
                      </span>
                    ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- The ticket: a live demo next to what makes it different ---------- */}
      <section className={`section ${s.ticketSection}`}>
        <div className={`container ${s.ticketGrid}`}>
          <div className={s.demoCol}>
            <div className={s.demo} data-tone="hive">
              <div className={s.demoHead}>
                <span className="tag muted">At the door</span>
                <strong>Your live ticket</strong>
              </div>
              <LiveTicketQR secret={DEMO_SECRET} ticketRef="DEMOQR" size={180} />
              <div className={`tear ${s.demoTear}`} />
              <p className="small muted">The code changes every 30 seconds. That&apos;s what the door scanner checks.</p>
            </div>
          </div>
          <div>
            <h2 className="h2">Tickets that can&apos;t be faked</h2>
            <ul className={s.features}>
              {FEATURES.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className={`${s.feature} reveal`} style={vars({ "--i": i })}>
                  <span className={s.featureIcon} aria-hidden="true">
                    <Icon size={24} weight="bold" />
                  </span>
                  <div>
                    <h3 className="h3">{title}</h3>
                    <p className="muted">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Review wall: the one marquee on the page ---------- */}
      {reviews.length > 0 && (
        <section className={`section ${s.reviewsSection}`}>
          <div className="container">
            <h2 className={`h2 ${s.headSpace}`}>What people said after</h2>
          </div>
          <div className={s.marquee}>
            <div className={s.track}>
              {[...reviews, ...reviews].map((r, i) => {
                const ev = typeof r.eventId === "object" ? r.eventId : null;
                const name = typeof r.userId === "object" ? r.userId.name : "Guest";
                return (
                  <figure key={`${r._id}-${i}`} className={s.review} data-tone={categoryMeta(ev?.category ?? "other").tone} aria-hidden={i >= reviews.length || undefined}>
                    <span className={s.stars} aria-label={`${r.rating} out of 5`}>
                      {Array.from({ length: 5 }, (_, k) => (
                        <Star key={k} size={16} weight={k < r.rating ? "fill" : "regular"} aria-hidden="true" />
                      ))}
                    </span>
                    <blockquote>{r.comment}</blockquote>
                    <figcaption>
                      <strong>{name}</strong>
                      {ev && <span>at {ev.title}</span>}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Hosts: people worth following, then the pitch to run your own ---------- */}
      {hosts.length > 0 && (
        <section id="hosts" className="section">
          <div className="container">
            <h2 className={`h2 ${s.headSpace}`}>Hosts worth following</h2>
            <ul className={s.hosts}>
              {hosts.map((h) => (
                <li key={h._id}>
                  <Link href={`/hosts/${h._id}`} className={s.hostRow}>
                    <span className={s.hostAvatar} aria-hidden="true">{initials(h.name)}</span>
                    <span className={s.hostName}>
                      {h.name}
                      {h.verified && <SealCheck size={22} weight="fill" className={s.verified} aria-label="Verified host" />}
                    </span>
                    <span className={s.hostBio}>{h.bio}</span>
                    <span className={`mono ${s.hostStats}`}>
                      {plural(h.followers, "follower")}
                      <br />
                      {h.upcoming} upcoming
                    </span>
                    <ArrowRight size={22} weight="bold" className={s.hostArrow} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {user?.role !== "attendee" && (
        <section id="host" className={s.hostBand}>
          <div className={`container ${s.hostInner}`}>
            <div>
              <h2 className={`display ${s.hostTitle}`}>Run your own night.</h2>
              <p className={s.hostLead}>Ticket tiers, promo codes, approvals, a waitlist, door check-in and live sales charts. Free to start.</p>
            </div>
            <Link href={hostHref} className="btn btn-ink btn-lg">
              {user ? "Create an event" : "Start hosting"} <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
