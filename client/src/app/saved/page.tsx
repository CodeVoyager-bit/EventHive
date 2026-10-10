import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "@phosphor-icons/react/ssr";
import EventCard from "@/components/EventCard";
import { apiFetch } from "@/lib/server";
import { isPast } from "@/lib/format";
import type { Event } from "@/types";
import s from "./saved.module.css";

export const metadata: Metadata = { title: "Saved events" };

export default async function SavedPage() {
  const events = await apiFetch<Event[]>("/me/saved");
  const upcoming = events.filter((e) => !isPast(e.date));
  const past = events.filter((e) => isPast(e.date));

  return (
    <div className="container">
      <header className={s.head}>
        <h1 className="h1">Saved</h1>
        {events.length > 0 && (
          <p className="muted num">
            {upcoming.length} upcoming{past.length > 0 && `, ${past.length} past`}
          </p>
        )}
      </header>

      {events.length === 0 ? (
        <div className="empty">
          <Heart size={40} weight="duotone" aria-hidden="true" />
          <h2 className="h3">Nothing saved yet</h2>
          <p className="muted">Tap the heart on any event to keep it here for later.</p>
          <Link href="/events" className="btn btn-primary">Browse Events</Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="grid-cards">
              {upcoming.map((event) => (
                <EventCard key={event._id} event={event} saved signedIn />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <>
              <h2 className={s.group}>Already happened</h2>
              <div className="grid-cards">
                {past.map((event) => (
                  <EventCard key={event._id} event={event} saved signedIn />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
