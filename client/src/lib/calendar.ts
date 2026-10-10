import type { Event } from "@/types";

// Events have a start time only; calendars get a 2-hour block.
// ponytail: fixed duration; add an `endsAt` field to events if organizers need real end times.
const DURATION_MS = 2 * 60 * 60 * 1000;

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const where = (e: Event) => (e.eventType === "online" ? e.meetingLink || e.platform || "Online" : [e.address, e.location].filter(Boolean).join(", "));

export function googleCalendarUrl(e: Event, pageUrl: string) {
  const start = new Date(e.date);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(start)}/${stamp(new Date(start.getTime() + DURATION_MS))}`,
    details: `${e.description}\n\n${pageUrl}`,
    location: where(e),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// RFC 5545 text escaping and 75-octet line folding
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (line: string) => line.match(/.{1,73}/g)?.join("\r\n ") ?? line;

export function toIcs(e: Event, pageUrl: string) {
  const start = new Date(e.date);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventHive//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e._id}@eventhive`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + DURATION_MS))}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(`${e.description}\n\n${pageUrl}`)}`,
    `LOCATION:${esc(where(e))}`,
    `URL:${pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");
}
