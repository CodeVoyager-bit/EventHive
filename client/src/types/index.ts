export type Role = "attendee" | "organizer" | "admin";

export const CATEGORIES = ["music", "tech", "sports", "art", "food", "business", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
export type RefundPolicy = "flexible" | "moderate" | "strict";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  city?: string;
  bio?: string;
  verified?: boolean;
  createdAt: string;
  referrals?: number;
}

export interface Tier {
  _id: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  remaining: number;
  salesEnd?: string;
  maxPerOrder: number;
}

export interface PromoCode {
  code: string;
  kind: "percent" | "flat";
  amount: number;
  limit: number;
  remaining: number;
  expiresAt?: string;
}

export interface Question {
  _id: string;
  label: string;
  required: boolean;
}

export type HostRef = { _id: string; name: string; email?: string; verified?: boolean };

export interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string; // city, or "Online"
  capacity: number;
  bookedCount: number;
  price: number; // cheapest tier
  tiers: Tier[];
  promoCodes?: PromoCode[]; // only for the event's host
  questions: Question[];
  category: Category;
  imageUrl: string;
  organizerId: HostRef | string;
  eventType: "online" | "venue";
  meetingLink?: string; // only for ticket holders and the host
  platform?: string;
  address?: string; // hidden for secret-location events until confirmed
  mapLocation?: string;
  requiresApproval: boolean;
  secretLocation: boolean;
  showGuests: boolean;
  absorbFees: boolean;
  refundPolicy: RefundPolicy;
  salesStart?: string | null; // tickets go on sale at this time
  groupDiscount?: { minQty: number; percent: number } | null;
  status: "draft" | "published" | "cancelled";
  publishedAt?: string;
  createdAt: string;
  revenue?: number; // on the organizer's own events
  pending?: number;
}

export interface Pricing {
  subtotal: number;
  discount: number; // promo + group discount together
  group?: number; // the group-discount part of `discount`
  fee: number;
  gst: number;
  protection: number;
  total: number;
}

export interface Quote extends Pricing {
  tierId: string;
  tierName: string;
  unitPrice: number;
  quantity: number;
  promoCode: string | null;
  payout: number;
  absorbFees: boolean;
  refundPolicy: string;
}

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface Ticket {
  _id: string;
  bookingId: string;
  eventId: string | (Pick<Event, "_id" | "title" | "date" | "location" | "address" | "eventType" | "meetingLink" | "platform" | "imageUrl" | "category" | "status" | "secretLocation"> & { organizerId: string });
  ownerId: string | { _id: string; name: string; email: string };
  holderName: string;
  tierName: string;
  ref: string;
  secret?: string; // only on the owner's own tickets
  status: "valid" | "void";
  checkedInAt?: string;
  transferredAt?: string;
  createdAt: string;
}

export interface Booking {
  _id: string;
  userId: { _id: string; name: string; email: string } | string;
  eventId: (Pick<Event, "_id" | "title" | "date" | "location" | "address" | "eventType" | "price" | "imageUrl" | "category" | "refundPolicy" | "status"> & { organizerId: string }) | null;
  bookingDate: string;
  status: BookingStatus;
  tierId: string;
  tierName: string;
  quantity: number;
  unitPrice: number;
  promoCode?: string;
  protection: boolean;
  refundPolicy?: RefundPolicy; // the policy this booking was sold under
  pricing: Pricing;
  amount: number;
  answers: { question: string; answer: string }[];
  referrerId?: { _id: string; name: string } | string;
  viaWaitlist: boolean;
  transactionId?: string;
  refundAmount?: number;
  decidedAt?: string;
  cancelledAt?: string;
  tickets: Ticket[];
}

export interface Review {
  _id: string;
  eventId: string | { _id: string; title: string; category: Category };
  userId: { _id: string; name: string } | string;
  rating: number;
  comment: string;
  reply?: { body: string; createdAt: string };
  createdAt: string;
}

export interface ReviewStats {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
}

export interface Social {
  going: number;
  interested: number;
  waiting: number;
  showGuests: boolean;
  guests: string[];
}

export interface Viewer {
  isHost: boolean;
  booking: { _id: string; status: BookingStatus; quantity: number; tierName: string } | null;
  hasTicket: boolean;
  waitlist: { position: number; quantity: number; tierId: string } | null;
  following: boolean;
  saved: boolean;
}

export interface HostQuestion {
  _id: string;
  eventId: string;
  userId: { _id: string; name: string } | string;
  body: string;
  answer?: { body: string; createdAt: string };
  createdAt: string;
}

export type TeamMember = { _id: string; name: string; email: string };

export interface DoorDesk {
  event: Pick<Event, "_id" | "title" | "date" | "location" | "address" | "eventType" | "category" | "imageUrl" | "status">;
  isHost: boolean;
  guests: { _id: string; holderName: string; tierName: string; ref: string; checkedInAt?: string }[];
}

export type PickReason = { kind: "host"; name: string } | { kind: "category"; category: Category } | { kind: "city"; city: string };
export type EventPick = Event & { reason: PickReason };

export type PayoutStatus = "upcoming" | "scheduled" | "paid" | "cancelled";
export interface Payouts {
  delayDays: number;
  summary: { paid: number; scheduled: number; upcoming: number; next: { amount: number; date: string; title: string } | null };
  events: {
    _id: string;
    title: string;
    date: string;
    category: Category;
    status: PayoutStatus;
    tickets: number;
    sales: number;
    fees: number;
    kept: number;
    payout: number;
    payoutDate: string | null;
    reference: string | null;
  }[];
}

export interface Audience {
  summary: { people: number; regulars: number; repeatRate: number; followers: number; averageSpend: number };
  people: {
    _id: string;
    name: string;
    email: string;
    city?: string;
    events: number;
    tickets: number;
    spent: number;
    first: string;
    last: string;
    lastEvent: string;
    follows: boolean;
  }[];
}

export type ReportReason = "scam" | "spam" | "offensive" | "wrong_info" | "other";
export interface ReportGroup {
  _id: string; // any one report in the group; resolving it resolves them all
  kind: "event" | "question";
  targetId: string;
  event: { _id: string; title: string; date: string; status: Event["status"]; organizerId: { _id: string; name: string } } | null;
  question: string | null;
  reports: { reason: ReportReason; note?: string; reporter: string; createdAt: string }[];
}

export interface Passport {
  name: string;
  memberSince: string;
  stats: { events: number; cities: number; hosts: number; upcoming: number; reviews: number; following: number };
  cities: string[];
  categories: { category: Category; count: number }[];
  badges: { id: string; label: string; hint: string; value: number; goal: number; earned: boolean }[];
  stamps: { _id: string; title: string; date: string; location: string; category: Category }[];
}

export interface Announcement {
  _id: string;
  body: string;
  authorId: { _id: string; name: string } | string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  readAt?: string;
  createdAt: string;
}

export interface WaitlistEntry {
  _id: string;
  eventId: Pick<Event, "_id" | "title" | "date" | "location" | "imageUrl" | "category" | "tiers"> | null;
  userId: string | { _id: string; name: string; email: string };
  tierId: string;
  quantity: number;
  status: "waiting" | "promoted" | "left";
  createdAt: string;
}

export interface HostCard {
  _id: string;
  name: string;
  bio?: string;
  city?: string;
  verified: boolean;
  followers: number;
  upcoming: number;
}

export interface HostProfile {
  host: Pick<User, "_id" | "name" | "bio" | "city" | "verified" | "createdAt" | "role">;
  followers: number;
  upcoming: Event[];
  past: Event[];
  rating: { averageRating: number; reviewCount: number };
  reviews: Review[];
  eventsHosted: number;
}

export interface DailyPoint {
  date: string;
  bookings: number;
  tickets: number;
  revenue: number;
}

export interface Analytics {
  timeZone: string;
  revenue: number;
  views: number;
  conversion: number | null; // % of page viewers who booked, last 30 days
  sold: number;
  capacity: number;
  tiers: { _id: string; name: string; price: number; capacity: number; sold: number; revenue: number }[];
  checkIn: { total: number; checkedIn: number };
  referrers: { name: string; bookings: number; tickets: number }[];
  waiting: number;
  pending: number;
  promos: { code: string; used: number; limit: number }[];
  daily: DailyPoint[];
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
