"use client";

import { useEffect } from "react";

// Counts one page view per event per browser session (hosts' own visits aren't counted)
export default function ViewPing({ eventId }: { eventId: string }) {
  useEffect(() => {
    const key = `viewed:${eventId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: count anyway */
    }
    fetch(`/api/events/${eventId}/view`, { method: "POST", keepalive: true }).catch(() => {});
  }, [eventId]);
  return null;
}
