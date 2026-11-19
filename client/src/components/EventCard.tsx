import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, LockSimple, MapPin, SealCheck, Sparkle } from "@phosphor-icons/react/ssr";
import type { Event } from "@/types";
import { categoryMeta } from "@/lib/categories";
import { formatDate, formatPrice, formatTime, fromPrice, host, isPast, relativeDay, seatsLeft } from "@/lib/format";
import SaveButton from "./SaveButton";
import s from "./EventCard.module.css";

// A gig poster with a ticket stub: the photo prints as a duotone in the category's ink
// (full colour on hover), the stub carries the date stamp, and the price sits past the tear line.
// priority: the page's main image (preloaded); eager: above the fold, so don't wait for scrolling;
// note: why this card is here (e.g. "From Maya, who you follow")
type Props = { event: Event; priority?: boolean; eager?: boolean; saved?: boolean; signedIn?: boolean; note?: string };

export function eventStatus(event: Event): { label: string; hot: boolean } | null {
  const left = seatsLeft(event);
  const filled = event.bookedCount / Math.max(event.capacity, 1);
  if (event.status === "cancelled") return { label: "Cancelled", hot: false };
  if (isPast(event.date)) return { label: "Ended", hot: false };
  if (event.salesStart && new Date(event.salesStart).getTime() > Date.now()) {
    return { label: `On sale ${formatDate(event.salesStart, { weekday: "short", day: "numeric", month: "short" })}`, hot: true };
  }
  if (left === 0) return { label: "Sold out", hot: false };
  if (left <= 3) return { label: `Only ${left} left`, hot: true };
  if (filled >= 0.75) return { label: "Almost full", hot: true };
  if (filled >= 0.5) return { label: "Selling fast", hot: true };
  const soon = event.tiers?.find((t) => t.salesEnd && new Date(t.salesEnd).getTime() - Date.now() < 3 * 86_400_000 && new Date(t.salesEnd).getTime() > Date.now() && t.remaining > 0);
  if (soon) return { label: `${soon.name} ends soon`, hot: true };
  return null;
}

export default function EventCard({ event, priority = false, eager = false, saved = false, signedIn = false, note }: Props) {
  const meta = categoryMeta(event.category);
  const Icon = meta.icon;
  const status = eventStatus(event);
  const when = relativeDay(event.date);
  const h = host(event);
  const price = fromPrice(event);
  const multi = (event.tiers?.length ?? 0) > 1;

  return (
    <article className={`${s.card} riso-host`} data-tone={meta.tone}>
      <Link href={`/events/${event._id}`} className={s.link}>
        <ViewTransition name={`ev-${event._id}`} share="morph" default="none">
          <div className={`${s.media} riso`}>
            {event.imageUrl ? (
              <Image src={event.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px" preload={priority} loading={priority || eager ? "eager" : undefined} />
            ) : (
              <span className={s.placeholder}>
                <Icon size={56} weight="duotone" aria-hidden="true" />
              </span>
            )}
          </div>
        </ViewTransition>

        <div className={s.body}>
          <div className={s.stamp} aria-hidden="true">
            <span className={s.mon}>{formatDate(event.date, { month: "short" })}</span>
            <span className={s.day}>{formatDate(event.date, { day: "numeric" })}</span>
            <span className={s.wd}>{formatDate(event.date, { weekday: "short" })}</span>
          </div>
          <div className={s.info}>
            <p className={`tag ${s.kicker}`}>
              <Icon size={14} weight="bold" aria-hidden="true" /> {meta.label}
              {when && <span className={s.when}>{when}</span>}
            </p>
            <h3 className={s.title}>{event.title}</h3>
            <p className={s.meta}>
              <time dateTime={event.date}>{formatTime(event.date)}</time>
              <span aria-hidden="true">/</span>
              {event.eventType === "online" ? <Globe size={14} aria-hidden="true" /> : <MapPin size={14} aria-hidden="true" />}
              <span className={s.place}>{event.location}</span>
            </p>
            <p className={s.host}>
              by {h.name}
              {h.verified && <SealCheck size={15} weight="fill" className={s.verified} aria-label="Verified host" />}
            </p>
            {note && (
              <p className={s.note}>
                <Sparkle size={13} weight="fill" aria-hidden="true" /> {note}
              </p>
            )}
          </div>
        </div>

        <div className={s.foot}>
          <span className={`${s.price} mono`}>
            {multi && price > 0 && <small>from </small>}
            {formatPrice(price)}
          </span>
          {event.requiresApproval && (
            <span className="badge badge-quiet" title="The host approves each request">
              <LockSimple size={12} weight="bold" aria-hidden="true" /> Approval
            </span>
          )}
          {status && <span className={`badge ${status.hot ? "" : "badge-quiet"}`}>{status.label}</span>}
        </div>
      </Link>
      {/* Sibling of the link (a button cannot live inside an <a>) */}
      <div className={s.save}>
        <SaveButton eventId={event._id} saved={saved} signedIn={signedIn} />
      </div>
    </article>
  );
}
