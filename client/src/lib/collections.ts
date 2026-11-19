import type { Tone } from "./categories";
import type { Event } from "@/types";
import { fromPrice, seatsLeft } from "./format";

// Curated lists (Eventbrite It-Lists style), defined as rules over upcoming events
export type Collection = { slug: string; title: string; blurb: string; tone: Tone; match: (e: Event) => boolean };

const DAY = 86_400_000;
const within = (e: Event, days: number) => new Date(e.date).getTime() - Date.now() <= days * DAY;
const hour = (e: Event) => Number(new Date(e.date).toLocaleString("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }));

export const COLLECTIONS: Collection[] = [
  { slug: "free-this-week", title: "Free this week", blurb: "Meetups, swaps and RSVPs that cost nothing.", tone: "green", match: (e) => fromPrice(e) === 0 && within(e, 7) },
  { slug: "date-night", title: "Date night", blurb: "Evening gigs and tables for two.", tone: "pink", match: (e) => ["music", "food", "other"].includes(e.category) && hour(e) >= 18 && e.eventType === "venue" },
  { slug: "learn-something", title: "Learn something", blurb: "Workshops, bootcamps and talks.", tone: "blue", match: (e) => ["tech", "art", "business"].includes(e.category) },
  { slug: "almost-gone", title: "Almost gone", blurb: "Few seats left. Decide fast.", tone: "orange", match: (e) => seatsLeft(e) > 0 && (seatsLeft(e) <= 3 || e.bookedCount / e.capacity >= 0.7) },
  { slug: "from-your-sofa", title: "From your sofa", blurb: "Online events you can join from anywhere.", tone: "violet", match: (e) => e.eventType === "online" },
  { slug: "early-start", title: "Early start", blurb: "Runs, yoga and breakfasts before work.", tone: "teal", match: (e) => hour(e) < 11 },
];

export const collectionBySlug = (slug: string) => COLLECTIONS.find((c) => c.slug === slug);
