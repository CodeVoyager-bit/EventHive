import { z } from "zod";

// Request validation at the trust boundary. Unknown keys are stripped, so clients
// cannot set server-owned fields such as organizerId or bookedCount.

export const CATEGORIES = ["music", "tech", "sports", "art", "food", "business", "other"] as const;
export const EVENT_TYPES = ["online", "venue"] as const;

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const email = z.email().trim().toLowerCase();

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email,
  password: z.string().min(6).max(128),
  role: z.enum(["attendee", "organizer"]).default("attendee"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

const eventFields = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  date: z.coerce.date(),
  location: z.string().trim().min(1).max(120),
  capacity: z.coerce.number().int().min(1).max(100000),
  price: z.coerce.number().min(0).max(100000),
  category: z.enum(CATEGORIES),
  imageUrl: z.union([z.literal(""), z.url()]).default(""),
  eventType: z.enum(EVENT_TYPES),
  meetingLink: z.string().trim().max(500).optional(),
  platform: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
  mapLocation: z.string().trim().max(300).optional(),
  status: z.enum(["draft", "published", "cancelled"]).default("published"),
});

export const createEventSchema = eventFields.refine((e) => e.date > new Date(), {
  message: "Date must be in the future",
  path: ["date"],
});
export const updateEventSchema = eventFields.partial();

export const createBookingSchema = z.object({
  eventId: objectId,
  ticketType: z.enum(["general", "vip"]).default("general"),
});

export const createReviewSchema = z.object({
  eventId: objectId,
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(1000),
});

export const listEventsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(CATEGORIES).optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuery>;
