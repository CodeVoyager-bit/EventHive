import Image from "next/image";
import Link from "next/link";
import { Calendar, Globe, MapPin } from "lucide-react";
import type { Event } from "@/types";
import { categoryMeta, catStyle } from "@/lib/categories";
import { formatDate, formatPrice, formatTime, isPast } from "@/lib/format";
import s from "./EventCard.module.css";

export default function EventCard({ event, priority = false }: { event: Event; priority?: boolean }) {
  const meta = categoryMeta(event.category);
  const Icon = meta.icon;
  const left = Math.max(event.capacity - event.bookedCount, 0);
  const pct = Math.min(100, Math.round((event.bookedCount / event.capacity) * 100));
  const past = isPast(event.date);

  return (
    <Link href={`/events/${event._id}`} className={s.card} style={catStyle(event.category)}>
      <div className={s.media}>
        {event.imageUrl ? (
          <Image src={event.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={priority} />
        ) : (
          <div className={s.placeholder}>
            <Icon size={40} aria-hidden="true" />
          </div>
        )}
        <span className={`badge badge-cat ${s.cat}`}>{meta.label}</span>
        {past ? (
          <span className={`badge ${s.flag}`}>Ended</span>
        ) : left === 0 ? (
          <span className={`badge badge-danger ${s.flag}`}>Sold out</span>
        ) : null}
      </div>

      <div className={s.body}>
        <div className={s.date}>
          <Calendar size={14} aria-hidden="true" />
          {formatDate(event.date, { month: "short", day: "numeric" })} · {formatTime(event.date)}
        </div>
        <h3 className={s.title}>{event.title}</h3>
        <div className={s.loc}>
          {event.eventType === "online" ? <Globe size={14} aria-hidden="true" /> : <MapPin size={14} aria-hidden="true" />}
          {event.location}
        </div>
        <div className={s.foot}>
          <span className={s.price}>
            {formatPrice(event.price)}
            {event.price > 0 && <small>/ticket</small>}
          </span>
          <span className={s.spots}>
            <span className={s.bar} aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
            <span className="small muted num">{left} left</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
