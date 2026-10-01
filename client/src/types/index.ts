export type Role = "attendee" | "organizer" | "admin";

export const CATEGORIES = ["music", "tech", "sports", "art", "food", "business", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  bookedCount: number;
  price: number;
  category: Category;
  imageUrl: string;
  organizerId: { _id: string; name: string; email: string } | string;
  eventType: "online" | "venue";
  meetingLink?: string;
  platform?: string;
  address?: string;
  mapLocation?: string;
  status: "draft" | "published" | "cancelled";
  createdAt: string;
  revenue?: number; // present on the organizer's own events
}

export interface Booking {
  _id: string;
  userId: { _id: string; name: string; email: string } | string;
  eventId: Pick<Event, "_id" | "title" | "date" | "location" | "price" | "imageUrl" | "category"> | null;
  bookingDate: string;
  status: "confirmed" | "cancelled";
  ticketType: "general" | "vip";
  ticketCode: string;
  amount: number;
  transactionId?: string;
}

export interface Review {
  _id: string;
  eventId: string;
  userId: { _id: string; name: string } | string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ReviewStats {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
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
