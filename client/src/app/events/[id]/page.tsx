import type { Metadata } from "next";
import { cache, ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDots, Globe, LinkSimple, MapPin, Ticket, User } from "@phosphor-icons/react/ssr";
import Stars from "@/components/Stars";
import EventCard from "@/components/EventCard";
import SaveButton from "@/components/SaveButton";
import ShareButton from "@/components/ShareButton";
import CalendarMenu from "@/components/CalendarMenu";
import { headers } from "next/headers";
import BookingCard from "./BookingCard";
import ReviewForm from "./ReviewForm";
import { apiFetch, apiFetchPaged, ApiError, getSavedIds, getSessionUser } from "@/lib/server";
import { categoryMeta } from "@/lib/categories";
import { formatDate, formatDateTime, isPast, organizerName } from "@/lib/format";
import type { Event, ReviewStats } from "@/types";
import s from "./event.module.css";

type Props = { params: Promise<{ id: string }> };

// Deduplicated between generateMetadata and the page
const getEvent = cache(async (id: string) => {
  try {
    return await apiFetch<Event>(`/events/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEvent((await params).id);
  const description = event.description.slice(0, 160);
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, images: event.imageUrl ? [event.imageUrl] : [] },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getEvent(id);
  const [stats, user, savedIds, similar, host] = await Promise.all([
    apiFetch<ReviewStats>(`/reviews/event/${id}`),
    getSessionUser(),
    getSavedIds(),
    apiFetchPaged<Event>(`/events?category=${event.category}&limit=4`)
      .then((r) => r.items.filter((e) => e._id !== event._id).slice(0, 3))
      .catch(() => [] as Event[]),
    headers().then((h) => h.get("host")),
  ]);
  const pageUrl = `${host?.startsWith("localhost") ? "http" : "https"}://${host}/events/${event._id}`;

  const meta = categoryMeta(event.category);
  const past = isPast(event.date);
  const left = Math.max(event.capacity - event.bookedCount, 0);
  const online = event.eventType === "online";

  const facts = [
    { icon: CalendarDots, label: "When", value: formatDateTime(event.date) },
    {
      icon: online ? Globe : MapPin,
      label: online ? "Where" : "Venue",
      value: online ? event.platform || event.location : event.location,
      sub: online ? undefined : event.address,
    },
    { icon: User, label: "Hosted by", value: organizerName(event) },
    { icon: Ticket, label: "Seats", value: `${event.bookedCount} of ${event.capacity} booked` },
  ];

  return (
    <div className="container" data-tone={meta.tone}>
      <Link href="/events" className={s.back}>
        <ArrowLeft size={16} aria-hidden="true" /> All events
      </Link>

      <ViewTransition name={`ev-${event._id}`} share="morph" default="none">
        <div className={s.media}>
          {event.imageUrl ? (
            <Image src={event.imageUrl} alt="" fill priority sizes="(max-width: 1240px) 100vw, 1180px" />
          ) : (
            <span className={s.placeholder}>
              <meta.icon size={80} weight="duotone" aria-hidden="true" />
            </span>
          )}
        </div>
      </ViewTransition>

      <div className={s.layout}>
        <article className={s.main}>
          <div className={`rise ${s.badges}`}>
            <span className={`badge ${s.catBadge}`}>
              <meta.icon size={14} aria-hidden="true" /> {meta.label}
            </span>
            <span className="badge">{online ? "Online" : "In person"}</span>
            {past && <span className="badge">Ended</span>}
            {!past && left === 0 && <span className="badge badge-danger">Sold out</span>}
          </div>
          <h1 className={`h1 rise ${s.title}`} style={{ "--i": 1 } as React.CSSProperties}>{event.title}</h1>

          <ul className={`rise ${s.facts}`} style={{ "--i": 2 } as React.CSSProperties}>
            {facts.map(({ icon: Icon, label, value, sub }) => (
              <li key={label}>
                <Icon size={20} aria-hidden="true" className={s.factIcon} />
                <span className={s.factLabel}>{label}</span>
                <span className={s.factValue}>{value}</span>
                {sub && <span className={s.factSub}>{sub}</span>}
              </li>
            ))}
          </ul>

          <div className={`rise ${s.actions}`} style={{ "--i": 3 } as React.CSSProperties}>
            <SaveButton eventId={event._id} saved={savedIds.has(event._id)} signedIn={!!user} variant="inline" />
            <ShareButton title={event.title} />
            {!past && <CalendarMenu event={event} pageUrl={pageUrl} />}
          </div>

          {online && event.meetingLink && (
            <p className={s.join}>
              {user ? (
                <a href={event.meetingLink} target="_blank" rel="noreferrer" className="text-link">
                  <LinkSimple size={16} aria-hidden="true" /> Open join link
                </a>
              ) : (
                <span className="muted small">The join link appears here after you sign in.</span>
              )}
            </p>
          )}

          <section className={s.section} aria-labelledby="about-title">
            <h2 id="about-title" className="h3">About this event</h2>
            <p className={s.desc}>{event.description}</p>
          </section>

          <section className={s.section} aria-labelledby="reviews-title">
            <div className={s.reviewsHead}>
              <h2 id="reviews-title" className="h3">Reviews</h2>
              {stats.reviewCount > 0 && (
                <span className={s.rating}>
                  <Stars value={stats.averageRating} />
                  <strong className="num">{stats.averageRating}</strong>
                  <span className="muted small num">({stats.reviewCount})</span>
                </span>
              )}
            </div>

            {stats.reviews.length === 0 ? (
              <p className="muted">{past ? "No reviews yet. Attendees can be the first." : "Reviews open once the event has ended."}</p>
            ) : (
              <ul className={s.reviewList}>
                {stats.reviews.map((review) => {
                  const name = typeof review.userId === "object" ? review.userId.name : "Attendee";
                  return (
                    <li key={review._id} className={`reveal ${s.review}`}>
                      <span className={s.avatar} aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
                      <div>
                        <div className={s.reviewTop}>
                          <strong>{name}</strong>
                          <Stars value={review.rating} size={14} />
                        </div>
                        <p className={s.reviewText}>{review.comment}</p>
                        <span className="small muted">{formatDate(review.createdAt, { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {past &&
              (user ? (
                <ReviewForm eventId={event._id} />
              ) : (
                <p className="muted small" style={{ marginTop: 16 }}>
                  <Link href={`/auth/login?next=/events/${event._id}`} className="accent">Sign in</Link> to leave a review if you attended.
                </p>
              ))}
          </section>
        </article>

        <aside className={s.sidebar}>
          <BookingCard
            eventId={event._id}
            price={event.price}
            left={left}
            capacity={event.capacity}
            past={past}
            available={event.status === "published"}
            signedIn={!!user}
          />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className={s.similar} aria-labelledby="similar-title">
          <h2 id="similar-title" className="h2">More like this</h2>
          <div className="grid-cards">
            {similar.map((e) => (
              <EventCard key={e._id} event={e} saved={savedIds.has(e._id)} signedIn={!!user} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
