import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Globe, Link2, MapPin, Ticket, UserRound } from "lucide-react";
import Stars from "@/components/Stars";
import BookingCard from "./BookingCard";
import ReviewForm from "./ReviewForm";
import { apiFetch, ApiError, getSessionUser } from "@/lib/server";
import { categoryMeta, catStyle } from "@/lib/categories";
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
  const [stats, user] = await Promise.all([apiFetch<ReviewStats>(`/reviews/event/${id}`), getSessionUser()]);

  const meta = categoryMeta(event.category);
  const Icon = meta.icon;
  const past = isPast(event.date);
  const left = Math.max(event.capacity - event.bookedCount, 0);

  return (
    <div className="container section">
      <div className={s.layout} style={catStyle(event.category)}>
        <article>
          <div className={s.media}>
            {event.imageUrl ? (
              <Image src={event.imageUrl} alt="" fill priority sizes="(max-width: 960px) 100vw, 800px" />
            ) : (
              <div className={s.placeholder}>
                <Icon size={72} aria-hidden="true" />
              </div>
            )}
            <div className={s.badges}>
              <span className="badge badge-cat">{meta.label}</span>
              <span className="badge">{event.eventType === "online" ? "Online" : "In person"}</span>
              {past && <span className="badge">Ended</span>}
              {!past && left === 0 && <span className="badge badge-danger">Sold out</span>}
            </div>
          </div>

          <p className="eyebrow">{formatDate(event.date, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className={`h2 ${s.title}`}>{event.title}</h1>

          <dl className={s.metaGrid}>
            <div className={s.metaItem}>
              <span className={s.metaIcon}><CalendarDays size={18} aria-hidden="true" /></span>
              <div><dt>Date and time</dt><dd>{formatDateTime(event.date)}</dd></div>
            </div>
            <div className={s.metaItem}>
              <span className={s.metaIcon}>{event.eventType === "online" ? <Globe size={18} aria-hidden="true" /> : <MapPin size={18} aria-hidden="true" />}</span>
              <div>
                <dt>{event.eventType === "online" ? "Platform" : "Location"}</dt>
                <dd>
                  {event.eventType === "online" ? event.platform || event.location : event.location}
                  {event.eventType === "venue" && event.address && <span className={s.sub}>{event.address}</span>}
                  {event.eventType === "online" && event.meetingLink && (
                    <span className={s.sub}>
                      {user ? (
                        <a href={event.meetingLink} target="_blank" rel="noreferrer" className={s.link}>
                          <Link2 size={14} aria-hidden="true" /> Join link
                        </a>
                      ) : (
                        "Join link visible after signing in"
                      )}
                    </span>
                  )}
                </dd>
              </div>
            </div>
            <div className={s.metaItem}>
              <span className={s.metaIcon}><UserRound size={18} aria-hidden="true" /></span>
              <div><dt>Organized by</dt><dd>{organizerName(event)}</dd></div>
            </div>
            <div className={s.metaItem}>
              <span className={s.metaIcon}><Ticket size={18} aria-hidden="true" /></span>
              <div><dt>Capacity</dt><dd className="num">{event.bookedCount} of {event.capacity} seats booked</dd></div>
            </div>
          </dl>

          <h2 className="h3" style={{ marginBottom: 10 }}>About this event</h2>
          <p className={s.desc}>{event.description}</p>

          <section className={s.reviews} aria-labelledby="reviews-title">
            <div className={s.reviewsHead}>
              <h2 id="reviews-title" className="h3">Reviews</h2>
              {stats.reviewCount > 0 && (
                <span className={s.rating}>
                  <Stars value={stats.averageRating} />
                  <strong className="num">{stats.averageRating}</strong>
                  <span className="muted small">({stats.reviewCount})</span>
                </span>
              )}
            </div>

            {stats.reviews.length === 0 ? (
              <p className="muted" style={{ marginBottom: 20 }}>
                {past ? "No reviews yet. Attendees can be the first." : "Reviews open once the event has ended."}
              </p>
            ) : (
              <ul className={s.reviewList}>
                {stats.reviews.map((review) => (
                  <li key={review._id} className={`card ${s.review}`}>
                    <div className={s.reviewTop}>
                      <strong>{typeof review.userId === "object" ? review.userId.name : "Attendee"}</strong>
                      <Stars value={review.rating} size={14} />
                    </div>
                    <p className={s.reviewText}>{review.comment}</p>
                    <span className="small muted">{formatDate(review.createdAt, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </li>
                ))}
              </ul>
            )}

            {past && (user ? <ReviewForm eventId={event._id} /> : (
              <p className="muted small">
                <Link href={`/auth/login?next=/events/${event._id}`} className={s.link}>Sign in</Link> to leave a review if you attended.
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
    </div>
  );
}
