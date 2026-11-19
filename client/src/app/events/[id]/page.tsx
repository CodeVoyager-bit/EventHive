import type { Metadata } from "next";
import { cache, ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, ArrowSquareOut, CalendarDots, ChatsCircle, Clock, Globe, LockSimple, MapPin, Megaphone, SealCheck, ShieldCheck, UsersThree } from "@phosphor-icons/react/ssr";
import Stars from "@/components/Stars";
import EventCard from "@/components/EventCard";
import SaveButton from "@/components/SaveButton";
import ShareButton from "@/components/ShareButton";
import CalendarMenu from "@/components/CalendarMenu";
import FollowButton from "@/components/FollowButton";
import BookingPanel from "./BookingPanel";
import ReviewForm from "./ReviewForm";
import ReplyForm from "./ReplyForm";
import ViewPing from "./ViewPing";
import { AnswerForm, AskForm, RemoveQuestion } from "./Questions";
import ReportButton from "@/components/ReportButton";
import { apiFetch, apiFetchPaged, ApiError, getSavedIds, getSessionUser } from "@/lib/server";
import { categoryMeta } from "@/lib/categories";
import { formatDate, formatDateTime, formatPrice, formatTime, fromPrice, host, initials, isPast, plural } from "@/lib/format";
import { FEE_COPY, policyCopy } from "@/lib/policies";
import { first, type SearchParams } from "@/lib/query";
import type { Announcement, Event, HostProfile, HostQuestion, ReviewStats, Social, Viewer } from "@/types";
import s from "./event.module.css";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

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
    openGraph: { title: event.title, description }, // image: opengraph-image.tsx (a generated share card)
    twitter: { card: "summary_large_image", title: event.title, description },
  };
}

export default async function EventDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const event = await getEvent(id);
  const h = host(event);
  const user = await getSessionUser();
  const [stats, savedIds, similar, social, viewer, updates, hostProfile, reqHost, questions] = await Promise.all([
    apiFetch<ReviewStats>(`/reviews/event/${id}`).catch(() => ({ reviews: [], averageRating: 0, reviewCount: 0 }) as ReviewStats),
    getSavedIds(),
    apiFetchPaged<Event>(`/events?category=${event.category}&limit=4`)
      .then((r) => r.items.filter((e) => e._id !== event._id).slice(0, 3))
      .catch(() => [] as Event[]),
    apiFetch<Social>(`/events/${id}/social`).catch(() => null),
    user ? apiFetch<Viewer>(`/events/${id}/viewer`).catch(() => null) : Promise.resolve(null),
    apiFetch<{ locked: boolean; count: number; items: Announcement[] }>(`/events/${id}/announcements`).catch(() => null),
    apiFetch<HostProfile>(`/hosts/${h._id}`).catch(() => null),
    headers().then((hd) => hd.get("host")),
    apiFetch<HostQuestion[]>(`/events/${id}/qa`).catch(() => [] as HostQuestion[]),
  ]);
  const pageUrl = `${reqHost?.startsWith("localhost") ? "http" : "https"}://${reqHost}/events/${event._id}`;

  const meta = categoryMeta(event.category);
  const past = isPast(event.date);
  const online = event.eventType === "online";
  const policy = policyCopy(event.refundPolicy);
  const isHost = !!viewer?.isHost;
  const canAsk = !past && event.status === "published";
  const notYetOnSale = !!event.salesStart && new Date(event.salesStart).getTime() > Date.now();
  const mapsUrl = event.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.address}, ${event.location}`)}` : null;

  return (
    <div className={`container ${s.page}`} data-tone={meta.tone}>
      {!isHost && event.status === "published" && <ViewPing eventId={event._id} />}
      <Link href="/events" className={s.back}>
        <ArrowLeft size={16} weight="bold" aria-hidden="true" /> All events
      </Link>

      <header className={s.header}>
        <div className={s.headText}>
          <p className={`tag ${s.kicker}`}>
            <meta.icon size={16} weight="bold" aria-hidden="true" /> {meta.label}
            <span aria-hidden="true">/</span> {online ? "Online" : event.location}
          </p>
          <h1 className={`h1 rise ${s.title}`}>{event.title}</h1>
          <div className={s.badges}>
            {event.status === "cancelled" && <span className="badge badge-danger">Cancelled</span>}
            {event.status === "draft" && <span className="badge badge-quiet">Draft</span>}
            {past && event.status !== "cancelled" && <span className="badge badge-quiet">Ended</span>}
            {event.requiresApproval && <span className="badge badge-quiet"><LockSimple size={12} weight="bold" aria-hidden="true" /> Host approves guests</span>}
            {event.secretLocation && <span className="badge badge-quiet">Secret location</span>}
          </div>
        </div>
        <div className={s.dateStamp} aria-hidden="true">
          <span>{formatDate(event.date, { month: "short" })}</span>
          <strong>{formatDate(event.date, { day: "numeric" })}</strong>
          <span>{formatDate(event.date, { weekday: "long" })}</span>
        </div>
      </header>

      <ViewTransition name={`ev-${event._id}`} share="morph" default="none">
        <div className={`${s.media} riso riso-color`}>
          {event.imageUrl ? (
            <Image src={event.imageUrl} alt="" fill preload loading="eager" sizes="(max-width: 1240px) 100vw, 1180px" />
          ) : (
            <span className={s.placeholder}>
              <meta.icon size={80} weight="duotone" aria-hidden="true" />
            </span>
          )}
        </div>
      </ViewTransition>

      <div className={s.layout}>
        <article className={s.main}>
          <ul className={s.facts}>
            <li>
              <CalendarDots size={22} weight="bold" aria-hidden="true" />
              <span className={s.factLabel}>When</span>
              <span className={s.factValue}>{formatDateTime(event.date)}</span>
            </li>
            <li>
              {online ? <Globe size={22} weight="bold" aria-hidden="true" /> : <MapPin size={22} weight="bold" aria-hidden="true" />}
              <span className={s.factLabel}>{online ? "Online" : "Where"}</span>
              {online ? (
                <span className={s.factValue}>
                  {event.platform || "Online"}
                  {event.meetingLink ? (
                    <a href={event.meetingLink} target="_blank" rel="noreferrer" className="text-link">Join link <ArrowSquareOut size={14} aria-hidden="true" /></a>
                  ) : (
                    <span className={s.factSub}>The join link appears here once you have a ticket.</span>
                  )}
                </span>
              ) : event.address ? (
                <span className={s.factValue}>
                  {event.address}, {event.location}
                  {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-link">Open in Maps <ArrowSquareOut size={14} aria-hidden="true" /></a>}
                </span>
              ) : (
                <span className={s.factValue}>
                  {event.location}
                  <span className={s.factSub}><LockSimple size={13} weight="bold" aria-hidden="true" /> Exact address revealed to confirmed guests.</span>
                </span>
              )}
            </li>
            <li>
              <ShieldCheck size={22} weight="bold" aria-hidden="true" />
              <span className={s.factLabel}>Refunds</span>
              <span className={s.factValue}>{policy.label}<span className={s.factSub}>{policy.detail}</span></span>
            </li>
          </ul>

          <div className={s.actions}>
            <SaveButton eventId={event._id} saved={savedIds.has(event._id)} signedIn={!!user} variant="inline" />
            <ShareButton title={event.title} path={user ? `/events/${event._id}?ref=${user.id}` : undefined} label={user ? "Share your link" : "Share"} />
            {!past && <CalendarMenu event={event} pageUrl={pageUrl} />}
          </div>

          <section className={s.section} aria-labelledby="about-title">
            <h2 id="about-title" className="h3">About</h2>
            <p className={s.desc}>{event.description}</p>
          </section>

          {social && (
            <section className={s.section} aria-labelledby="going-title">
              <h2 id="going-title" className="h3">Who&apos;s going</h2>
              <div className={s.going}>
                <div className={s.faces} aria-hidden="true">
                  {social.guests.slice(0, 6).map((g, i) => (
                    <span key={i} className={s.face} style={{ zIndex: 10 - i }}>{initials(g)}</span>
                  ))}
                </div>
                <p>
                  <strong>{plural(social.going, "person", "people")} going</strong>
                  {social.interested > 0 && <>, {social.interested} interested</>}
                  {social.waiting > 0 && <>, {social.waiting} on the waitlist</>}
                  {social.showGuests && social.guests.length > 0 && (
                    <span className={s.names}>
                      {social.guests.slice(0, 4).join(", ")}
                      {social.going > 4 && " and others"}
                    </span>
                  )}
                  {!social.showGuests && <span className={s.names}>The host keeps the guest list private.</span>}
                </p>
              </div>
            </section>
          )}

          {updates && (updates.count > 0 || isHost) && (
            <section id="updates" className={s.section} aria-labelledby="updates-title">
              <h2 id="updates-title" className="h3">
                <Megaphone size={22} weight="bold" aria-hidden="true" /> Updates from the host
              </h2>
              {updates.locked ? (
                <p className={s.locked}>
                  <LockSimple size={18} weight="bold" aria-hidden="true" />
                  {plural(updates.count, "update")} for ticket holders. Book to read them and get new ones in your notifications.
                </p>
              ) : updates.items.length === 0 ? (
                <p className="muted">No updates yet. Post one from your dashboard and every ticket holder is notified.</p>
              ) : (
                <ul className={s.updates}>
                  {updates.items.map((u) => (
                    <li key={u._id} className={s.update}>
                      <p>{u.body}</p>
                      <span className="tag muted">{formatDate(u.createdAt, { day: "numeric", month: "short" })}, {formatTime(u.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className={s.section} aria-labelledby="host-title">
            <h2 id="host-title" className="h3">Your host</h2>
            <div className={s.hostCard}>
              <span className={s.hostAvatar} aria-hidden="true">{initials(h.name)}</span>
              <div className={s.hostInfo}>
                <Link href={`/hosts/${h._id}`} className={s.hostName}>
                  {h.name}
                  {h.verified && <SealCheck size={20} weight="fill" className={s.verified} aria-label="Verified host" />}
                </Link>
                {hostProfile && (
                  <span className="mono small muted">
                    {plural(hostProfile.followers, "follower")} · {plural(hostProfile.eventsHosted, "event")}
                    {hostProfile.rating.reviewCount > 0 && <> · {hostProfile.rating.averageRating}★ from {plural(hostProfile.rating.reviewCount, "review")}</>}
                  </span>
                )}
                {hostProfile?.host.bio && <p className={s.hostBio}>{hostProfile.host.bio}</p>}
              </div>
              {!isHost && <FollowButton key={String(!!viewer?.following)} hostId={h._id} following={!!viewer?.following} signedIn={!!user} />}
            </div>
          </section>

          {(questions.length > 0 || canAsk) && (
            <section id="questions" className={s.section} aria-labelledby="questions-title">
              <h2 id="questions-title" className="h3">
                <ChatsCircle size={22} weight="bold" aria-hidden="true" /> Questions for the host
              </h2>
              {questions.length === 0 ? (
                <p className="muted">{isHost ? "No questions yet. When a guest asks one, it shows up here and in your notifications." : "Nothing asked yet. Answers show up here for everyone."}</p>
              ) : (
                <ul className={s.reviewList}>
                  {questions.map((q) => {
                    const asker = typeof q.userId === "object" ? q.userId : { _id: q.userId, name: "Guest" };
                    const mine = asker._id === user?.id;
                    return (
                      <li key={q._id} className={s.review}>
                        <span className={s.avatar} aria-hidden="true">{initials(asker.name)}</span>
                        <div>
                          <div className={s.reviewTop}>
                            <strong>{mine ? "You" : asker.name.split(" ")[0]}</strong>
                            <span className="small muted">asked {formatDate(q.createdAt, { day: "numeric", month: "short" })}</span>
                          </div>
                          <p className={s.reviewText}>{q.body}</p>
                          {q.answer ? (
                            <div className={s.reply}>
                              <strong>{h.name} answered</strong>
                              <p>{q.answer.body}</p>
                            </div>
                          ) : isHost ? (
                            <AnswerForm eventId={event._id} questionId={q._id} />
                          ) : (
                            <p className="tag muted" style={{ marginTop: 8 }}>Waiting for the host · only you can see this</p>
                          )}
                          {(mine || isHost) && <RemoveQuestion eventId={event._id} questionId={q._id} label={mine ? "Delete my question" : "Remove"} />}
                          {q.answer && !mine && !isHost && (
                            <div style={{ marginTop: 8 }}><ReportButton kind="question" targetId={q._id} signedIn={!!user} /></div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {canAsk && !isHost &&
                (user ? (
                  <AskForm eventId={event._id} />
                ) : (
                  <p className="muted small" style={{ marginTop: 16 }}>
                    <Link href={`/auth/login?next=/events/${event._id}%23questions`} className="text-link">Sign in</Link> to ask the host a question.
                  </p>
                ))}
            </section>
          )}

          <section className={s.section} aria-labelledby="print-title">
            <h2 id="print-title" className="h3">The small print</h2>
            <ul className={s.print}>
              <li><strong>Refunds.</strong> {policy.detail} Refund Protection at checkout covers you until doors open.</li>
              <li><strong>Fees.</strong> {event.absorbFees ? "The host covers all fees, so you pay the ticket price." : FEE_COPY}</li>
              <li><strong>Entry.</strong> Show the live QR from My Tickets. It refreshes every 30 seconds, so screenshots won&apos;t scan.</li>
              {event.requiresApproval && <li><strong>Approval.</strong> The host reviews every request. You&apos;re only charged once approved.</li>}
              {event.groupDiscount && <li><strong>Groups.</strong> Book {event.groupDiscount.minQty} or more tickets together and save {event.groupDiscount.percent}%. It&apos;s applied automatically.</li>}
            </ul>
            {!isHost && event.status === "published" && (
              // A div, not a p: the report dialog inside it can't live in a paragraph (breaks hydration)
              <div className="small muted" style={{ marginTop: 14 }}>
                Something wrong with this event? <ReportButton kind="event" targetId={event._id} signedIn={!!user} label="Report it" />
              </div>
            )}
          </section>

          <section id="reviews" className={s.section} aria-labelledby="reviews-title">
            <div className={s.reviewsHead}>
              <h2 id="reviews-title" className="h3">Reviews</h2>
              {stats.reviewCount > 0 && (
                <span className={s.rating}>
                  <Stars value={stats.averageRating} />
                  <strong className="mono">{stats.averageRating}</strong>
                  <span className="muted small mono">({stats.reviewCount})</span>
                </span>
              )}
            </div>

            {stats.reviews.length === 0 ? (
              <p className="muted">{past ? "No reviews yet. Guests can be the first." : "Reviews open once the event has ended."}</p>
            ) : (
              <ul className={s.reviewList}>
                {stats.reviews.map((review) => {
                  const name = typeof review.userId === "object" ? review.userId.name : "Guest";
                  return (
                    <li key={review._id} className={s.review}>
                      <span className={s.avatar} aria-hidden="true">{initials(name)}</span>
                      <div>
                        <div className={s.reviewTop}>
                          <strong>{name}</strong>
                          <Stars value={review.rating} size={14} />
                        </div>
                        <p className={s.reviewText}>{review.comment}</p>
                        <span className="small muted">{formatDate(review.createdAt, { day: "numeric", month: "short", year: "numeric" })}</span>
                        {review.reply ? (
                          <div className={s.reply}>
                            <strong>{h.name} replied</strong>
                            <p>{review.reply.body}</p>
                          </div>
                        ) : (
                          isHost && <ReplyForm reviewId={review._id} />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {past && !isHost &&
              (user ? (
                viewer?.hasTicket && <ReviewForm eventId={event._id} />
              ) : (
                <p className="muted small" style={{ marginTop: 16 }}>
                  <Link href={`/auth/login?next=/events/${event._id}`} className="text-link">Sign in</Link> to leave a review if you went.
                </p>
              ))}
          </section>
        </article>

        <aside id="tickets" className={s.sidebar}>
          <BookingPanel
            event={event}
            hostName={h.name}
            signedIn={!!user}
            userId={user?.id}
            viewer={viewer}
            initialCode={first(query.code) || undefined}
            referrer={first(query.ref) || undefined}
          />
          {!past && event.status === "published" && (
            <p className={s.seats}>
              <UsersThree size={18} weight="bold" aria-hidden="true" />
              {event.capacity - event.bookedCount > 0 ? `${event.capacity - event.bookedCount} of ${event.capacity} seats left` : "Sold out"}
              <Clock size={18} weight="bold" aria-hidden="true" className={s.clockIcon} />
              {formatTime(event.date)}
            </p>
          )}
        </aside>
      </div>

      {/* Phones: the checkout sits below the story, so keep a way to it on screen */}
      {!past && event.status === "published" && !viewer?.booking && !viewer?.isHost && (
        <a href="#tickets" className={s.mobileBar}>
          <span>
            <span className="small muted">{event.requiresApproval ? "Request to join" : "Tickets from"}</span>
            <strong className="mono">{formatPrice(fromPrice(event))}</strong>
          </span>
          <span className="btn btn-primary">
            {notYetOnSale
              ? `On sale ${formatDate(event.salesStart!, { day: "numeric", month: "short" })}`
              : event.capacity - event.bookedCount > 0 ? "Get tickets" : "Join waitlist"}
          </span>
        </a>
      )}

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
