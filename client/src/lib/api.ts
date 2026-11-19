import type { Announcement, Booking, Event, HostQuestion, Quote, Review, TeamMember, Ticket, User } from "@/types";

// Browser-side calls go through the same-origin /api proxy (see app/api/[...path]/route.ts).
// Reads happen in server components (lib/server.ts); this module covers mutations and live reads.

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers as Record<string, string>) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    if (res.status === 401 && !location.pathname.startsWith("/auth")) {
      location.assign(`/auth/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    }
    throw new Error(json?.error ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

const send = (body: unknown, method = "POST"): RequestInit => ({ method, body: JSON.stringify(body) });

export type BookingRequest = {
  eventId: string;
  tierId?: string;
  quantity: number;
  names?: string[];
  promoCode?: string;
  protection: boolean;
  answers: { questionId: string; answer: string }[];
  ref?: string;
  followHost: boolean;
};

export const api = {
  login: (body: { email: string; password: string }) => request<{ user: User }>("/auth/login", send(body)),
  register: (body: { name: string; email: string; password: string; role: string }) => request<{ user: User }>("/auth/register", send(body)),
  logout: () => request<null>("/auth/logout", { method: "POST" }),
  updateProfile: (body: { name?: string; city?: string; bio?: string }) => request<{ user: User }>("/auth/profile", send(body, "PATCH")),

  createEvent: (body: Record<string, unknown>) => request<Event>("/events", send(body)),
  updateEvent: (id: string, body: Record<string, unknown>) => request<Event>(`/events/${id}`, send(body, "PUT")),
  deleteEvent: (id: string) => request<{ message: string }>(`/events/${id}`, { method: "DELETE" }),
  cancelEvent: (id: string) => request<Event>(`/events/${id}/cancel`, { method: "POST" }),
  duplicateEvent: (id: string) => request<Event>(`/events/${id}/duplicate`, { method: "POST" }),
  quote: (id: string, body: { tierId?: string; quantity: number; promoCode?: string; protection: boolean }) => request<Quote>(`/events/${id}/quote`, send(body)),
  postAnnouncement: (id: string, body: string) => request<Announcement>(`/events/${id}/announcements`, send({ body })),
  joinWaitlist: (id: string, body: { tierId?: string; quantity: number }) => request<{ position: number }>(`/events/${id}/waitlist`, send(body)),
  leaveWaitlist: (id: string) => request<{ left: boolean }>(`/events/${id}/waitlist`, { method: "DELETE" }),
  askHost: (id: string, body: string) => request<HostQuestion>(`/events/${id}/qa`, send({ body })),
  answerQuestion: (id: string, questionId: string, body: string) => request<HostQuestion>(`/events/${id}/qa/${questionId}/answer`, send({ body })),
  removeQuestion: (id: string, questionId: string) => request<{ removed: boolean }>(`/events/${id}/qa/${questionId}`, { method: "DELETE" }),
  report: (body: { kind: "event" | "question"; targetId: string; reason: string; note?: string }) => request<{ reported: boolean }>("/me/reports", send(body)),
  resolveReport: (id: string, action: "dismiss" | "remove") => request<{ resolved: number }>(`/admin/reports/${id}`, send({ action }, "PATCH")),
  calendarToken: () => request<{ token: string }>("/me/calendar"),
  resetCalendarToken: () => request<{ token: string }>("/me/calendar/reset", { method: "POST" }),
  addToTeam: (id: string, email: string) => request<TeamMember[]>(`/events/${id}/team`, send({ email })),
  removeFromTeam: (id: string, userId: string) => request<TeamMember[]>(`/events/${id}/team/${userId}`, { method: "DELETE" }),

  createBooking: (body: BookingRequest) => request<Booking>("/bookings", send(body)),
  cancelBooking: (id: string) => request<Booking>(`/bookings/${id}/cancel`, { method: "PATCH" }),
  approveBooking: (id: string) => request<Booking>(`/bookings/${id}/approve`, { method: "PATCH" }),
  declineBooking: (id: string) => request<Booking>(`/bookings/${id}/decline`, { method: "PATCH" }),

  transferTicket: (id: string, email: string) => request<Ticket>(`/tickets/${id}/transfer`, send({ email })),
  checkIn: (body: { eventId: string; code: string }) => request<Ticket>("/tickets/check-in", send(body)),
  admit: (ticketId: string) => request<Ticket>(`/tickets/${ticketId}/admit`, { method: "POST" }),

  createReview: (body: { eventId: string; rating: number; comment: string }) => request<Review>("/reviews", send(body)),
  replyToReview: (id: string, body: string) => request<Review>(`/reviews/${id}/reply`, send({ body }, "PATCH")),

  saveEvent: (id: string) => request<{ saved: boolean }>(`/me/saved/${id}`, { method: "PUT" }),
  unsaveEvent: (id: string) => request<{ saved: boolean }>(`/me/saved/${id}`, { method: "DELETE" }),
  follow: (hostId: string) => request<{ following: boolean }>(`/me/following/${hostId}`, { method: "PUT" }),
  unfollow: (hostId: string) => request<{ following: boolean }>(`/me/following/${hostId}`, { method: "DELETE" }),
  markRead: (id?: string) => request<{ read: boolean }>(id ? `/me/notifications/${id}/read` : "/me/notifications/read", { method: "POST" }),

  verifyHost: (id: string, verified: boolean) => request<User>(`/admin/hosts/${id}`, send({ verified }, "PATCH")),
};
