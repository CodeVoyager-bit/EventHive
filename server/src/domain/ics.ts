// iCalendar (RFC 5545) for a subscribed feed of someone's tickets. Calendar apps re-fetch it,
// so new bookings appear, changed times move, and cancelled events show as cancelled.

export type FeedEvent = {
  id: string;
  title: string;
  start: Date;
  location: string;
  description: string;
  url: string;
  cancelled: boolean;
};

// Events have a start time only; calendars get a 2-hour block (same as the client's "Add to calendar")
const DURATION_MS = 2 * 60 * 60 * 1000;
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (line: string) => line.match(/.{1,73}/g)?.join("\r\n ") ?? line;

export function calendarFeed(name: string, events: FeedEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventHive//Tickets//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@eventhive`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(new Date(e.start.getTime() + DURATION_MS))}`,
      `SUMMARY:${esc(e.cancelled ? `Cancelled: ${e.title}` : e.title)}`,
      `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
      `LOCATION:${esc(e.location)}`,
      `DESCRIPTION:${esc(e.description)}`,
      ...(e.url ? [`URL:${e.url}`] : []),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
