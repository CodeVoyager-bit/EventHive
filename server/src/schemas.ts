import { z } from "zod";
import { REPORT_KINDS, REPORT_REASONS } from "./models/Report";
import { REFUND_POLICIES } from "./domain/policies";

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

const price = z.coerce
  .number()
  .min(0)
  .max(1_000_000) // rupees
  .refine((p) => p === 0 || p >= 20, "Paid tickets start at ₹20 (free is 0)");

const tierInput = z.object({
  _id: objectId.optional(),
  name: z.string().trim().min(1).max(40),
  description: z.string().trim().max(160).optional(),
  price,
  capacity: z.coerce.number().int().min(1).max(100_000),
  salesEnd: z.coerce.date().nullish(),
  maxPerOrder: z.coerce.number().int().min(1).max(10).default(6),
});

const promoInput = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/, "Use 4-20 letters or digits"),
    kind: z.enum(["percent", "flat"]),
    amount: z.coerce.number().min(1),
    limit: z.coerce.number().int().min(1).max(100_000).default(100),
    expiresAt: z.coerce.date().nullish(),
  })
  .refine((p) => p.kind !== "percent" || p.amount <= 100, { message: "A percentage cannot exceed 100", path: ["amount"] });

const questionInput = z.object({
  _id: objectId.optional(),
  label: z.string().trim().min(2).max(120),
  required: z.boolean().default(false),
});

const eventFields = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  date: z.coerce.date(),
  location: z.string().trim().min(1).max(120), // city, or "Online"
  // Either tiers, or price + capacity as shorthand for a single "General" tier
  tiers: z
    .array(tierInput)
    .min(1)
    .max(6)
    .refine((t) => new Set(t.map((x) => x.name.toLowerCase())).size === t.length, "Tier names must be different")
    .optional(),
  capacity: z.coerce.number().int().min(1).max(100_000).optional(),
  price: price.optional(),
  promoCodes: z
    .array(promoInput)
    .max(10)
    .refine((p) => new Set(p.map((x) => x.code)).size === p.length, "Promo codes must be different")
    .optional(),
  questions: z.array(questionInput).max(5).optional(),
  category: z.enum(CATEGORIES),
  imageUrl: z.union([z.literal(""), z.url()]).default(""),
  eventType: z.enum(EVENT_TYPES),
  meetingLink: z.string().trim().max(500).optional(),
  platform: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
  mapLocation: z.string().trim().max(300).optional(),
  requiresApproval: z.boolean().optional(),
  secretLocation: z.boolean().optional(),
  showGuests: z.boolean().optional(),
  absorbFees: z.boolean().optional(),
  refundPolicy: z.enum(REFUND_POLICIES).optional(),
  salesStart: z.coerce.date().nullish(), // null clears it: on sale right away
  groupDiscount: z
    .object({ minQty: z.coerce.number().int().min(2).max(10), percent: z.coerce.number().int().min(1).max(50) })
    .nullish(),
  status: z.enum(["draft", "published"]).default("published"),
});

export const createEventSchema = eventFields
  .refine((e) => e.date > new Date(), { message: "Date must be in the future", path: ["date"] })
  .refine((e) => e.tiers || e.capacity !== undefined, { message: "Add at least one ticket tier", path: ["tiers"] });
// A changed date must be in the future (checked in EventService, which knows the current date)
export const updateEventSchema = eventFields.partial().extend({ status: z.enum(["draft", "published"]).optional() });

export const createBookingSchema = z.object({
  eventId: objectId,
  tierId: objectId.optional(), // defaults to the first tier on sale
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  names: z.array(z.string().trim().max(80)).max(10).optional(), // one per ticket; blank = buyer's name
  promoCode: z.string().trim().toUpperCase().max(20).optional(),
  protection: z.boolean().default(false),
  answers: z.array(z.object({ questionId: objectId, answer: z.string().trim().max(500) })).max(5).default([]),
  ref: objectId.optional(), // referrer's user id from a shared link
  followHost: z.boolean().default(false),
});

export const quoteSchema = z.object({
  tierId: objectId.optional(),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  promoCode: z.string().trim().toUpperCase().max(20).optional(),
  protection: z.boolean().default(false),
});

export const waitlistSchema = z.object({
  tierId: objectId.optional(),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});

export const transferSchema = z.object({ email });
export const emailBody = z.object({ email });
export const reportSchema = z.object({
  kind: z.enum(REPORT_KINDS),
  targetId: objectId,
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).optional(),
});
export const resolveReportSchema = z.object({ action: z.enum(["dismiss", "remove"]) });
export const textBody = z.object({ body: z.string().trim().min(1).max(1000) });
export const verifySchema = z.object({ verified: z.boolean() });

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  city: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(400).optional(),
});

export const createReviewSchema = z.object({
  eventId: objectId,
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(1000),
});

// A scanned QR ("EH1:ABCDEF:123456") or a typed door code ("ABCDEF 123456"); parsed in TicketService
export const checkInSchema = z.object({
  eventId: objectId,
  code: z.string().trim().min(6).max(64),
});

export const statsQuery = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});

export const recentQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(6),
});

export const limitQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export const listEventsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(60).optional(), // a city name, or "Online"
  category: z.enum(CATEGORIES).optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  maxPrice: z.coerce.number().min(0).optional(), // rupees; 0 = free only
  sort: z.enum(["date", "price-asc", "price-desc", "popular"]).default("date"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuery>;
