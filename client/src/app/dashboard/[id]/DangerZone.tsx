"use client";

import { useRouter } from "next/navigation";
import { CalendarX, Trash } from "@phosphor-icons/react";
import ConfirmButton from "@/components/ConfirmButton";
import { api } from "@/lib/api";
import s from "../dashboard.module.css";

// Booked events are cancelled (everyone refunded and told); drafts and empty events can be deleted
export default function DangerZone({ eventId, title, status, past, hasBookings }: { eventId: string; title: string; status: string; past: boolean; hasBookings: boolean }) {
  const router = useRouter();
  if (status === "cancelled" || past) return null;
  return (
    <section className={s.danger} aria-label="Danger zone">
      <span className="small" style={{ flex: 1, minWidth: 220 }}>
        {hasBookings ? "Cancelling refunds every guest in full, fees included, and notifies them and the waitlist." : "Nobody has booked yet, so this event can be deleted outright."}
      </span>
      {hasBookings ? (
        <ConfirmButton
          className="btn btn-danger btn-sm"
          title={`Cancel ${title}?`}
          description="Every booking is refunded in full, all tickets stop working, and guests and the waitlist are notified. This can't be undone."
          confirmLabel="Cancel event"
          keepLabel="Keep event"
          onConfirm={async () => {
            await api.cancelEvent(eventId);
            router.refresh();
          }}
        >
          <CalendarX size={16} weight="bold" aria-hidden="true" /> Cancel event
        </ConfirmButton>
      ) : (
        <ConfirmButton
          className="btn btn-danger btn-sm"
          title={`Delete ${title}?`}
          description="The event and its page are removed. This can't be undone."
          confirmLabel="Delete event"
          keepLabel="Keep event"
          onConfirm={async () => {
            await api.deleteEvent(eventId);
            router.push("/dashboard");
            router.refresh();
          }}
        >
          <Trash size={16} weight="bold" aria-hidden="true" /> Delete event
        </ConfirmButton>
      )}
    </section>
  );
}
