import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import app from "../index";
import User from "../models/User";
import Event from "../models/Event";
import Booking from "../models/Booking";
import Review from "../models/Review";

const uri = process.env.MONGODB_URI ?? "";
assert.ok(uri.endsWith("_test"), "tests must run against a *_test database (see `npm test`)");

type Json = {
  success: boolean;
  data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  error?: string;
  pagination?: { total: number; page: number; limit: number; pages: number };
};

let server: Server;
let base: string;
let n = 0;

before(async () => {
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), Event.init(), Booking.init(), Review.init()]); // wait for unique indexes
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  server.close();
  await mongoose.disconnect();
});

async function api(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  const res = await fetch(base + path, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, json: (await res.json()) as Json };
}

const register = (role: string, email = `user${++n}@test.io`) =>
  api("/auth/register", { method: "POST", body: { name: `User ${n}`, email, password: "secret123", role } });
async function user(role: string): Promise<{ token: string; id: string }> {
  const r = await register(role);
  assert.equal(r.status, 201, r.json.error);
  return { token: r.json.data.token, id: r.json.data.user._id };
}
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);
const eventBody = (o: Record<string, unknown> = {}) => ({
  title: "Test Event", description: "A description that is long enough.", date: inDays(7).toISOString(),
  location: "Pune", capacity: 1, price: 10, category: "tech", eventType: "venue", ...o,
});

test("registration rejects the admin role and duplicate emails", async () => {
  assert.equal((await register("admin")).status, 400);
  const ok = await register("organizer", "dup@test.io");
  assert.equal(ok.status, 201);
  assert.equal((await register("attendee", "dup@test.io")).status, 409);
  assert.equal((await api("/auth/login", { method: "POST", body: { email: "dup@test.io", password: "wrong" } })).status, 401);
});

test("only the owner (or admin) can update, delete and list attendees; server-owned fields are ignored", async () => {
  const owner = await user("organizer");
  const other = await user("organizer");
  const created = await api("/events", { method: "POST", token: owner.token, body: eventBody({ bookedCount: 50, organizerId: "000000000000000000000000" }) });
  assert.equal(created.status, 201, created.json.error);
  assert.equal(created.json.data.bookedCount, 0);
  const id = created.json.data._id;

  assert.equal((await api(`/events/${id}`, { method: "PUT", token: other.token, body: { title: "Hijacked" } })).status, 403);
  assert.equal((await api(`/bookings/event/${id}`, { token: other.token })).status, 403);
  assert.equal((await api(`/events/${id}`, { method: "DELETE", token: other.token })).status, 403);
  assert.equal((await api(`/events/${id}`, { method: "PUT", token: owner.token, body: { date: "not a date" } })).status, 400);

  const updated = await api(`/events/${id}`, { method: "PUT", token: owner.token, body: { title: "Renamed", bookedCount: 99 } });
  assert.equal(updated.json.data.title, "Renamed");
  assert.equal(updated.json.data.bookedCount, 0);
  assert.equal((await api(`/bookings/event/${id}`, { token: owner.token })).status, 200);
  assert.equal((await api(`/events/${id}`, { method: "DELETE", token: owner.token })).status, 200);
  assert.equal((await api(`/events/${id}`)).status, 404);
});

test("booking: duplicate, sold out, past event, and cancel restores the seat", async () => {
  const org = await user("organizer");
  const a1 = await user("attendee");
  const a2 = await user("attendee");
  const ev = (await api("/events", { method: "POST", token: org.token, body: eventBody({ capacity: 1 }) })).json.data;

  const b1 = await api("/bookings", { method: "POST", token: a1.token, body: { eventId: ev._id, ticketType: "vip" } });
  assert.equal(b1.status, 201, b1.json.error);
  assert.equal(b1.json.data.amount, 20); // VIP is double
  assert.ok(b1.json.data.transactionId);
  assert.equal((await api("/bookings", { method: "POST", token: a1.token, body: { eventId: ev._id } })).status, 409); // duplicate
  assert.equal((await api("/bookings", { method: "POST", token: a2.token, body: { eventId: ev._id } })).status, 409); // sold out

  const cancelled = await api(`/bookings/${b1.json.data._id}/cancel`, { method: "PATCH", token: a1.token });
  assert.equal(cancelled.status, 200, cancelled.json.error);
  assert.equal(cancelled.json.data.status, "cancelled");
  assert.equal((await api(`/events/${ev._id}`)).json.data.bookedCount, 0);
  assert.equal((await api(`/bookings/${b1.json.data._id}/cancel`, { method: "PATCH", token: a2.token })).status, 403);
  assert.equal((await api("/bookings", { method: "POST", token: a2.token, body: { eventId: ev._id } })).status, 201); // seat is free again

  const past = await Event.create({ ...eventBody({ date: inDays(-1) }), organizerId: new mongoose.Types.ObjectId() });
  assert.equal((await api("/bookings", { method: "POST", token: a1.token, body: { eventId: past._id.toString() } })).status, 400);
});

test("reviews need attendance and an ended event; stats are computed", async () => {
  const u1 = await user("attendee");
  const u2 = await user("attendee");
  const past = await Event.create({ ...eventBody({ date: inDays(-2) }), organizerId: new mongoose.Types.ObjectId() });
  const future = await Event.create({ ...eventBody(), organizerId: new mongoose.Types.ObjectId() });
  await Booking.create({ userId: u1.id, eventId: past._id, ticketCode: "ABC", amount: 10, status: "confirmed" });
  const body = (eventId: unknown) => ({ eventId: String(eventId), rating: 4, comment: "Great" });

  assert.equal((await api("/reviews", { method: "POST", token: u1.token, body: body(future._id) })).status, 400); // not ended
  assert.equal((await api("/reviews", { method: "POST", token: u2.token, body: body(past._id) })).status, 403); // did not attend
  assert.equal((await api("/reviews", { method: "POST", token: u1.token, body: body(past._id) })).status, 201);
  assert.equal((await api("/reviews", { method: "POST", token: u1.token, body: body(past._id) })).status, 409); // one per user

  const stats = (await api(`/reviews/event/${past._id}`)).json.data;
  assert.equal(stats.averageRating, 4);
  assert.equal(stats.reviewCount, 1);
  assert.equal(stats.reviews.length, 1);
});

test("listing filters, searches and paginates published events", async () => {
  await Event.deleteMany({});
  const org = new mongoose.Types.ObjectId();
  await Event.create([
    { ...eventBody({ title: "Jazz Night", category: "music", date: inDays(3) }), organizerId: org },
    { ...eventBody({ title: "Rust Workshop", category: "tech", eventType: "online", date: inDays(10) }), organizerId: org },
    { ...eventBody({ title: "Hidden Draft", category: "tech", status: "draft" }), organizerId: org },
  ]);
  const page = await api("/events?limit=1");
  assert.equal(page.json.data.length, 1);
  assert.deepEqual(page.json.pagination, { total: 2, page: 1, limit: 1, pages: 2 });
  assert.equal((await api("/events?q=jazz")).json.data[0].title, "Jazz Night");
  assert.equal((await api("/events?category=tech")).json.data.length, 1);
  assert.equal((await api(`/events?from=${inDays(5).toISOString().slice(0, 10)}`)).json.data[0].title, "Rust Workshop");
  assert.equal((await api("/events?category=bogus")).status, 400);
  assert.equal((await api("/events/not-an-id")).status, 400);
});
