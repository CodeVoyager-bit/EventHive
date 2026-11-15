import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, MapPin } from "@phosphor-icons/react/ssr";
import type { Event } from "@/types";
import { categoryMeta } from "@/lib/categories";
import { formatPrice, formatTime, isPast } from "@/lib/format";
import SaveButton from "./SaveButton";
import s from "./EventCard.module.css";

// The signature element: an admission ticket. Photo on top, a perforated tear line,
// and a stub with the date block. Notches are real cut-outs (CSS masks).
type Props = { event: Event; priority?: boolean; saved?: boolean; signedIn?: boolean };

export default function EventCard({ event, priority = false, saved = false, signedIn = false }: Props) {
  const meta = categoryMeta(event.category);
  const Icon = meta.icon;
  const date = new Date(event.date);
  const left = Math.max(event.capacity - event.bookedCount, 0);
  const past = isPast(event.date);
  const filled = event.bookedCount / event.capacity;
  const status = past
    ? "Ended"
    : left === 0
      ? "Sold out"
      : left <= 3
        ? `Only ${left} left`
        : filled >= 0.75
          ? "Almost full"
          : filled >= 0.5
            ? "Selling fast"
            : null;

  return (
    <div className={s.card} data-tone={meta.tone} data-spotlight data-tilt>
      <Link href={`/events/${event._id}`} className={s.link}>
      <ViewTransition name={`ev-${event._id}`} share="morph" default="none">
        <div className={`${s.media} notch-b`}>
          {event.imageUrl ? (
            <Image src={event.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px" priority={priority} />
          ) : (
            <span className={s.placeholder}>
              <Icon size={44} weight="duotone" aria-hidden="true" />
            </span>
          )}
        </div>
      </ViewTransition>

      <div className={`${s.stub} notch-t perf-t`}>
        <div className={s.dateBlock} aria-hidden="true">
          <span className={s.day}>{date.toLocaleDateString("en-US", { day: "numeric" })}</span>
          <span className={s.mon}>{date.toLocaleDateString("en-US", { month: "short" })}</span>
        </div>
        <div className={s.info}>
          <h3 className={s.title}>{event.title}</h3>
          <p className={s.meta}>
            <time dateTime={event.date} className="sr-only">{date.toDateString()}</time>
            {date.toLocaleDateString("en-US", { weekday: "short" })} {formatTime(event.date)}
            <span aria-hidden="true"> · </span>
            {event.eventType === "online" ? <Globe size={14} aria-hidden="true" /> : <MapPin size={14} aria-hidden="true" />}
            {event.location}
          </p>
          <div className={s.foot}>
            <span className={s.cat}>
              <Icon size={15} aria-hidden="true" /> {meta.label}
            </span>
            {status && <span className={`${s.status} ${past || left === 0 ? "" : s.hot}`}>{status}</span>}
            <span className={`${s.price} num`}>{formatPrice(event.price)}</span>
          </div>
        </div>
      </div>
      </Link>
      {/* Sibling of the link (a button cannot live inside an <a>) */}
      <div className={s.save}>
        <SaveButton eventId={event._id} saved={saved} signedIn={signedIn} />
      </div>
    </div>
  );
}
