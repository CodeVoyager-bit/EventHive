import { TIME_ZONE } from "./format";

// Quick date windows for filters, as YYYY-MM-DD in Indian time
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
const DAY = 86_400_000;

export function datePresets() {
  const now = new Date();
  const weekday = new Date(now.toLocaleString("en-US", { timeZone: TIME_ZONE })).getDay(); // 0 = Sunday
  const toSat = weekday === 0 ? -1 : 6 - weekday; // on Sunday, "this weekend" started yesterday
  return {
    today: { from: ymd(now), to: ymd(now) },
    weekend: { from: ymd(new Date(now.getTime() + Math.max(toSat, 0) * DAY)), to: ymd(new Date(now.getTime() + (toSat + 1) * DAY)) },
    week: { from: ymd(now), to: ymd(new Date(now.getTime() + 6 * DAY)) },
  };
}
