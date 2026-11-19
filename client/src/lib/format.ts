import type { Event, HostRef, Tier } from "@/types";

// Everything renders in Indian time, on the server and in the browser alike (no hydration drift)
export const TIME_ZONE = "Asia/Kolkata";

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(iso).toLocaleDateString("en-IN", { timeZone: TIME_ZONE, ...opts });

export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE });

// Prices are in Indian rupees, with Indian digit grouping (₹1,19,999)
const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Whole rupees stay whole (₹799); anything with paise shows both digits (₹1,067.80, not ₹1,067.8)
const inr = { format: (n: number) => (Number.isInteger(Math.round(n * 100) / 100) ? inrWhole : inrPaise).format(n) };
export const formatPrice = (n: number) => (n === 0 ? "Free" : inr.format(n));
export const formatMoney = (n: number) => inr.format(n); // "₹0" rather than "Free", for receipts
export const formatRupees = (n: number) => inrWhole.format(Math.round(n)); // summary tiles: no paise

export const isPast = (iso: string) => new Date(iso).getTime() <= Date.now();
// Today's date (YYYY-MM-DD) in India, for date filters
export const todayInIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
// "Tonight", "Tomorrow", or the weekday, for urgency on cards
export function relativeDay(iso: string): string | null {
  const d = new Date(iso);
  const today = dayKey(new Date());
  if (dayKey(d) === today) return Number(d.toLocaleString("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE })) >= 17 ? "Tonight" : "Today";
  if (dayKey(d) === dayKey(new Date(Date.now() + 86_400_000))) return "Tomorrow";
  return null;
}

export const host = (event: Pick<Event, "organizerId">): HostRef =>
  typeof event.organizerId === "object" ? event.organizerId : { _id: event.organizerId, name: "Host" };
export const organizerName = (event: Pick<Event, "organizerId">) => host(event).name;

export const refId = (ref: { _id: string } | string | null | undefined) => (ref && typeof ref === "object" ? ref._id : ref ?? "");

export const onSale = (t: Tier) => !t.salesEnd || new Date(t.salesEnd).getTime() > Date.now();
// The price a buyer can actually get right now ("from ₹599")
export function fromPrice(event: Pick<Event, "tiers" | "price">): number {
  const open = (event.tiers ?? []).filter((t) => onSale(t) && t.remaining > 0);
  return open.length ? Math.min(...open.map((t) => t.price)) : event.price;
}
export const seatsLeft = (event: Pick<Event, "capacity" | "bookedCount">) => Math.max(0, event.capacity - event.bookedCount);

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

// "Priya Nair" -> "PN" for avatar stamps
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
