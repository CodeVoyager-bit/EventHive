import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarBlank, MapPin, SealCheck, Star } from "@phosphor-icons/react/ssr";
import EventCard from "@/components/EventCard";
import FollowButton from "@/components/FollowButton";
import Stars from "@/components/Stars";
import { apiFetch, ApiError, getSavedIds, getSessionUser } from "@/lib/server";
import { formatDate, initials, plural } from "@/lib/format";
import type { HostProfile } from "@/types";
import s from "./host.module.css";

type Props = { params: Promise<{ id: string }> };

const getHost = cache(async (id: string) => {
  try {
    return await apiFetch<HostProfile>(`/hosts/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { host } = await getHost((await params).id);
  return { title: host.name, description: host.bio };
}

// Public host page: follow them, see what's next, and what people said about past events
export default async function HostPage({ params }: Props) {
  const { id } = await params;
  const [profile, user, savedIds] = await Promise.all([getHost(id), getSessionUser(), getSavedIds()]);
  const following = user ? (await apiFetch<string[]>("/me/following/ids").catch(() => [] as string[])).includes(id) : false;
  const { host, followers, upcoming, past, rating, reviews, eventsHosted } = profile;
  const isMe = user?.id === id;

  return (
    <div className="container">
      <header className={s.head}>
        <span className={`${s.avatar} stamp`} aria-hidden="true">{initials(host.name)}</span>
        <div className={s.who}>
          <h1 className={`h1 ${s.name}`}>
            {host.name}
            {host.verified && <SealCheck size={40} weight="fill" className={s.verified} aria-label="Verified host" />}
          </h1>
          <p className={s.meta}>
            {host.city && <><MapPin size={16} weight="bold" aria-hidden="true" /> {host.city}</>}
            <CalendarBlank size={16} weight="bold" aria-hidden="true" /> Hosting since {formatDate(host.createdAt, { month: "long", year: "numeric" })}
          </p>
          {host.bio && <p className={`lead ${s.bio}`}>{host.bio}</p>}
          <div className={s.actions}>
            {isMe ? (
              <Link href="/settings" className="btn btn-secondary btn-sm">Edit your bio</Link>
            ) : (
              <FollowButton hostId={id} following={following} signedIn={!!user} size="md" />
            )}
          </div>
        </div>
        <dl className={s.stats}>
          <div><dt>Followers</dt><dd>{followers}</dd></div>
          <div><dt>Events</dt><dd>{eventsHosted}</dd></div>
          <div><dt>Rating</dt><dd>{rating.reviewCount ? <>{rating.averageRating}<Star size={20} weight="fill" aria-hidden="true" /></> : "New"}</dd></div>
        </dl>
      </header>

      <section className={s.section}>
        <h2 className="h2">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="muted">Nothing scheduled right now. Follow to hear about the next one first.</p>
        ) : (
          <div className="grid-cards">
            {upcoming.map((e, i) => (
              <EventCard key={e._id} event={{ ...e, organizerId: { _id: id, name: host.name, verified: host.verified } }} priority={i === 0} eager={i < 3} saved={savedIds.has(e._id)} signedIn={!!user} />
            ))}
          </div>
        )}
      </section>

      {reviews.length > 0 && (
        <section className={s.section}>
          <h2 className="h2">What guests said</h2>
          <p className="muted">{rating.averageRating} out of 5 from {plural(rating.reviewCount, "review")} across all their events.</p>
          <ul className={s.reviews}>
            {reviews.map((r) => (
              <li key={r._id} className={s.review}>
                <Stars value={r.rating} size={14} />
                <p>{r.comment}</p>
                <span className="small muted">
                  {typeof r.userId === "object" ? r.userId.name : "Guest"}
                  {typeof r.eventId === "object" && <> at {r.eventId.title}</>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className={s.section}>
          <h2 className="h2">Past events</h2>
          <ul className={s.past}>
            {past.map((e) => (
              <li key={e._id}>
                <Link href={`/events/${e._id}`} className={s.pastRow}>
                  <span className="mono">{formatDate(e.date, { day: "numeric", month: "short", year: "numeric" })}</span>
                  <strong>{e.title}</strong>
                  <span className="muted">{e.location}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
