import type { Booking, Event, Review, User } from "@/types";

// Browser-side calls go through the same-origin /api proxy (see app/api/[...path]/route.ts).
// Reads happen in server components (lib/server.ts); this module only covers mutations.

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers as Record<string, string>) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    if (res.status === 401 && !location.pathname.startsWith("/auth")) {
      location.assign(`/auth/login?next=${encodeURIComponent(location.pathname)}`);
    }
    throw new Error(json?.error ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

const post = (body: unknown, method = "POST"): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  login: (body: { email: string; password: string }) => request<{ user: User }>("/auth/login", post(body)),
  register: (body: { name: string; email: string; password: string; role: string }) =>
    request<{ user: User }>("/auth/register", post(body)),
  logout: () => request<null>("/auth/logout", { method: "POST" }),

  createEvent: (body: Record<string, unknown>) => request<Event>("/events", post(body)),
  updateEvent: (id: string, body: Record<string, unknown>) => request<Event>(`/events/${id}`, post(body, "PUT")),
  deleteEvent: (id: string) => request<{ message: string }>(`/events/${id}`, { method: "DELETE" }),

  createBooking: (body: { eventId: string; ticketType: "general" | "vip" }) => request<Booking>("/bookings", post(body)),
  cancelBooking: (id: string) => request<Booking>(`/bookings/${id}/cancel`, { method: "PATCH" }),

  createReview: (body: { eventId: string; rating: number; comment: string }) => request<Review>("/reviews", post(body)),
};
