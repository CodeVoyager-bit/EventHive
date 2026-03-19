export interface User {
  _id: string;
  name: string;
  email: string;
  role: "attendee" | "organizer" | "admin";
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
  category: string;
  imageUrl: string;
  organizerId: { _id: string; name: string; email: string } | string;
  eventType: "online" | "venue";
  meetingLink?: string;
  platform?: string;
  address?: string;
  mapLocation?: string;
  status: "draft" | "published" | "cancelled";
  createdAt: string;
}

export interface Booking {
  _id: string;
  userId: { _id: string; name: string; email: string } | string;
  eventId: Event | string;
  bookingDate: string;
  status: "confirmed" | "cancelled";
  ticketType: "general" | "vip";
  ticketCode: string;
  amount: number;
}

export interface Review {
  _id: string;
  eventId: string;
  userId: { _id: string; name: string } | string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
