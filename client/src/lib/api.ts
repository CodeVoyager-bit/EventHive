const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function removeToken(): void {
  localStorage.removeItem("token");
}

export function setUser(user: Record<string, unknown>): void {
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function removeUser(): void {
  localStorage.removeItem("user");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || "Something went wrong");
  }

  return data.data;
}

export const api = {
  // Auth
  register: (body: Record<string, string>) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  // Events
  getEvents: (params?: string) =>
    request(`/events${params ? `?${params}` : ""}`),
  getEvent: (id: string) => request(`/events/${id}`),
  searchEvents: (q: string) => request(`/events/search?q=${encodeURIComponent(q)}`),
  createEvent: (body: Record<string, unknown>) =>
    request("/events", { method: "POST", body: JSON.stringify(body) }),
  updateEvent: (id: string, body: Record<string, unknown>) =>
    request(`/events/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteEvent: (id: string) =>
    request(`/events/${id}`, { method: "DELETE" }),
  getMyEvents: () => request("/events/my/events"),

  // Bookings
  createBooking: (body: { eventId: string; ticketType: string }) =>
    request("/bookings", { method: "POST", body: JSON.stringify(body) }),
  getMyBookings: () => request("/bookings/my"),
  cancelBooking: (id: string) =>
    request(`/bookings/${id}/cancel`, { method: "PATCH" }),
  getEventBookings: (eventId: string) => request(`/bookings/event/${eventId}`),

  // Reviews
  getEventReviews: (eventId: string) => request(`/reviews/event/${eventId}`),
  createReview: (body: { eventId: string; rating: number; comment: string }) =>
    request("/reviews", { method: "POST", body: JSON.stringify(body) }),
};
