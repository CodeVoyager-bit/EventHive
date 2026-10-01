import type { Event } from "@/types";

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) =>
  new Date(iso).toLocaleDateString("en-US", opts);

export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export const formatPrice = (n: number) => (n === 0 ? "Free" : `$${n.toLocaleString("en-US")}`);

export const isPast = (iso: string) => new Date(iso).getTime() <= Date.now();

export const organizerName = (event: Event) => (typeof event.organizerId === "object" ? event.organizerId.name : "Organizer");

export const refId = (ref: { _id: string } | string | null | undefined) => (ref && typeof ref === "object" ? ref._id : ref ?? "");
