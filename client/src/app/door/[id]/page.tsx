import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, DoorOpen } from "@phosphor-icons/react/ssr";
import CheckInDesk from "@/components/CheckInDesk";
import DoorGuests from "./DoorGuests";
import { apiFetch, ApiError } from "@/lib/server";
import { formatDateTime } from "@/lib/format";
import type { DoorDesk } from "@/types";
import s from "./door.module.css";

export const metadata: Metadata = { title: "Door desk" };

// The door desk for the host and their door team: scan live QRs, type door codes, or admit by name.
// Helpers see names, tiers and ticket references only.
export default async function DoorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let desk: DoorDesk;
  try {
    desk = await apiFetch<DoorDesk>(`/events/${id}/door`);
  } catch (err) {
    if (err instanceof ApiError && [400, 403, 404].includes(err.status)) notFound(); // not on this door team
    throw err;
  }
  const { event, guests } = desk;
  const admitted = guests.filter((g) => g.checkedInAt).length;
  const place = event.eventType === "online" ? "Online" : event.address ? `${event.address}, ${event.location}` : event.location;

  return (
    <div className="container">
      <Link href={desk.isHost ? `/dashboard/${id}/attendees` : "/bookings"} className={s.back}>
        <ArrowLeft size={16} weight="bold" aria-hidden="true" /> {desk.isHost ? "Guests" : "My tickets"}
      </Link>
      <header className={s.head}>
        <div>
          <p className={`tag muted ${s.kicker}`}>
            <DoorOpen size={15} weight="bold" aria-hidden="true" /> Door desk{desk.isHost ? "" : " · you're on the door team"}
          </p>
          <h1 className="h1">{event.title}</h1>
          <p className="muted">{formatDateTime(event.date)} · {place}</p>
        </div>
        <div className={s.counter} aria-live="polite">
          <strong>{admitted}<span>/{guests.length}</span></strong>
          <span className="tag">checked in</span>
        </div>
      </header>

      {event.status === "cancelled" ? (
        <p className="alert alert-error">This event was cancelled, so there&apos;s no one to check in.</p>
      ) : (
        <>
          <CheckInDesk eventId={event._id} />
          <DoorGuests guests={guests} />
        </>
      )}
    </div>
  );
}
