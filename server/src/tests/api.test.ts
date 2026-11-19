import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import app from "../index";
import User from "../models/User";
import Event from "../models/Event";
import Booking from "../models/Booking";
import Ticket from "../models/Ticket";
import Review from "../models/Review";
import Waitlist from "../models/Waitlist";
import Notification from "../models/Notification";
import { codeAt, stepAt } from "../domain/totp";

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
  await Promise.all([User, Event, Booking, Ticket, Review, Waitlist, Notification].map((m) => (m as mongoose.Model<unknown>).init())); // unique indexes
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
const post = (path: string, token: string, body: unknown = {}) => api(path, { method: "POST", token, body });
const patch = (path: string, token: string, body: unknown = {}) => api(path, { method: "PATCH", token, body });

const register = (role: string, email = `user${++n}@test.io`) =>
  api("/auth/register", { method: "POST", body: { name: `User ${n}`, email, password: "secret123", role } });
async function user(role: string): Promise<{ token: string; id: string; email: string }> {
  const r = await register(role);
  assert.equal(r.status, 201, r.json.error);
  return { token: r.json.data.token, id: r.json.data.user._id, email: r.json.data.user.email };
}
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);
const eventBody = (o: Record<string, unknown> = {}) => ({
  title: "Test Event", description: "A description that is long enough.", date: inDays(7).toISOString(),
  location: "Pune", address: "Somewhere 1", capacity: 1, price: 100, category: "tech", eventType: "venue", ...o,
});
async function createEvent(token: string, o: Record<string, unknown> = {}) {
  const r = await post("/events", token, eventBody(o));
  assert.equal(r.status, 201, r.json.error);
  return r.json.data;
}
const book = (token: string, eventId: string, o: Record<string, unknown> = {}) => post("/bookings", token, { eventId, ...o });
// What the ticket owner's phone would show right now
async function doorCode(ticketId: string) {
  const t = await Ticket.findById(ticketId).select("+secret");
  return `EH1:${t!.ref}:${codeAt(t!.secret, stepAt(Date.now()))}`;
}

test("registration rejects the admin role and duplicate emails", async () => {
  assert.equal((await register("admin")).status, 400);
  const ok = await register("organizer", "dup@test.io");
  assert.equal(ok.status, 201);
  assert.equal((await register("attendee", "dup@test.io")).status, 409);
  assert.equal((await api("/auth/login", { method: "POST", body: { email: "dup@test.io", password: "wrong" } })).status, 401);
});

test("only the owner (or admin) can manage an event; server-owned fields are ignored; promo codes stay private", async () => {
  const owner = await user("organizer");
  const other = await user("organizer");
  const ev = await createEvent(owner.token, { bookedCount: 50, organizerId: "000000000000000000000000", promoCodes: [{ code: "SECRET10", kind: "percent", amount: 10 }] });
  assert.equal(ev.bookedCount, 0);
  assert.equal(ev.tiers.length, 1, "price + capacity become one General tier");
  assert.equal(ev.tiers[0].name, "General");

  assert.equal((await api(`/events/${ev._id}`, { method: "PUT", token: other.token, body: { title: "Hijacked" } })).status, 403);
  assert.equal((await api(`/bookings/event/${ev._id}`, { token: other.token })).status, 403);
  assert.equal((await api(`/events/${ev._id}/analytics`, { token: other.token })).status, 403);
  assert.equal((await api(`/events/${ev._id}`, { method: "DELETE", token: other.token })).status, 403);
  assert.equal((await api(`/events/${ev._id}`, { method: "PUT", token: owner.token, body: { date: "not a date" } })).status, 400);

  assert.equal((await api(`/events/${ev._id}`)).json.data.promoCodes, undefined, "the public never sees promo codes");
  assert.equal((await api(`/events/${ev._id}`, { token: owner.token })).json.data.promoCodes[0].code, "SECRET10");

  const updated = await api(`/events/${ev._id}`, { method: "PUT", token: owner.token, body: { title: "Renamed", bookedCount: 99 } });
  assert.equal(updated.json.data.title, "Renamed");
  assert.equal(updated.json.data.bookedCount, 0);
  assert.equal((await api(`/events/${ev._id}`, { method: "DELETE", token: owner.token })).status, 200);
  assert.equal((await api(`/events/${ev._id}`)).status, 404);
});

test("publishing needs an address (venue) or join link (online); drafts are hidden", async () => {
  const org = await user("organizer");
  assert.equal((await post("/events", org.token, eventBody({ address: "" }))).status, 400);
  assert.equal((await post("/events", org.token, eventBody({ eventType: "online", address: undefined }))).status, 400);
  const draft = await createEvent(org.token, { status: "draft", address: "" });
  assert.equal((await api(`/events/${draft._id}`)).status, 404);
  assert.equal((await api(`/events/${draft._id}`, { method: "PUT", token: org.token, body: { status: "published" } })).status, 400);
  const live = await api(`/events/${draft._id}`, { method: "PUT", token: org.token, body: { status: "published", address: "Hall 2" } });
  assert.equal(live.status, 200, live.json.error);
  assert.ok(live.json.data.publishedAt);
});

test("booking: tiers, group quantity, per-order limit, duplicate, sold out, past event; cancel restores seats", async () => {
  const org = await user("organizer");
  const a1 = await user("attendee");
  const a2 = await user("attendee");
  const ev = await createEvent(org.token, {
    tiers: [
      { name: "General", price: 100, capacity: 3, maxPerOrder: 3 },
      { name: "VIP", price: 300, capacity: 1, maxPerOrder: 1 },
    ],
  });
  const [general, vip] = ev.tiers;
  assert.equal(ev.capacity, 4);
  assert.equal(ev.price, 100, "the listing price is the cheapest tier");

  assert.equal((await book(a1.token, ev._id, { tierId: vip._id, quantity: 2 })).status, 400); // over the per-order limit
  assert.equal((await book(org.token, ev._id)).status, 400, "hosts can't book their own event");
  const b1 = await book(a1.token, ev._id, { tierId: general._id, quantity: 3, names: ["Asha", "", "Ravi"] });
  assert.equal(b1.status, 201, b1.json.error);
  assert.equal(b1.json.data.quantity, 3);
  assert.equal(b1.json.data.amount, 300);
  assert.equal(b1.json.data.pricing.total, 300 + 37.5 + 6.75); // fee: 2.5% of 300 + ₹10 × 3; GST: 18% of the fee
  assert.ok(b1.json.data.transactionId);
  const tickets = (await api("/tickets/my", { token: a1.token })).json.data;
  assert.deepEqual(tickets.map((t: { holderName: string }) => t.holderName).sort(), ["Asha", "Ravi", `User ${a1.email.match(/\d+/)![0]}'s guest`].sort());
  assert.ok(tickets.every((t: { secret: string }) => /^[0-9a-f]{40}$/.test(t.secret)), "owners get the QR secret");

  assert.equal((await book(a1.token, ev._id, { tierId: vip._id })).status, 409); // one active booking per event
  const sold = await book(a2.token, ev._id, { tierId: general._id });
  assert.equal(sold.status, 409);
  assert.match(sold.json.error ?? "", /sold out/);

  const cancelled = await api(`/bookings/${b1.json.data._id}/cancel`, { method: "PATCH", token: a1.token });
  assert.equal(cancelled.status, 200, cancelled.json.error);
  assert.equal(cancelled.json.data.status, "cancelled");
  assert.equal(cancelled.json.data.refundAmount, 300, "flexible policy refunds the ticket price, not fees");
  assert.equal((await api(`/events/${ev._id}`)).json.data.bookedCount, 0);
  assert.ok((await api("/tickets/my", { token: a1.token })).json.data.every((t: { status: string }) => t.status === "void"));
  assert.equal((await api(`/bookings/${b1.json.data._id}/cancel`, { method: "PATCH", token: a2.token })).status, 403);
  assert.equal((await book(a2.token, ev._id, { tierId: general._id })).status, 201); // seats are free again

  const past = await Event.create({ ...eventBody({ date: inDays(-1) }), tiers: [{ name: "General", price: 10, capacity: 5, remaining: 5 }], organizerId: new mongoose.Types.ObjectId() });
  assert.equal((await book(a1.token, past._id.toString())).status, 400);
});

test("promo codes: quote validates, usage limit is atomic, expired and unknown codes are refused", async () => {
  const org = await user("organizer");
  const ev = await createEvent(org.token, {
    capacity: 10,
    price: 1000,
    promoCodes: [
      { code: "ONCE", kind: "flat", amount: 250, limit: 1 },
      { code: "OLDIE", kind: "percent", amount: 50, expiresAt: inDays(-1).toISOString() },
    ],
  });
  const q = await post(`/events/${ev._id}/quote`, "", { quantity: 1, promoCode: "once" });
  assert.equal(q.status, 200, q.json.error);
  assert.equal(q.json.data.discount, 250);
  assert.equal((await post(`/events/${ev._id}/quote`, "", { promoCode: "OLDIE" })).json.error, "That promo code isn't valid for this event", "expired codes look like unknown ones");
  assert.equal((await post(`/events/${ev._id}/quote`, "", { promoCode: "NOPE" })).status, 400);

  // Five people race for a single-use code: exactly one gets it
  const buyers = await Promise.all(Array.from({ length: 5 }, () => user("attendee")));
  const results = await Promise.all(buyers.map((b) => book(b.token, ev._id, { promoCode: "ONCE" })));
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.ok(results.filter((r) => r.status !== 201).every((r) => /used up|isn't valid/.test(r.json.error ?? "")));
  assert.equal((await api(`/events/${ev._id}`)).json.data.bookedCount, 1, "losers' seats were given back");
});

test("rotating QR check-in: only the owner, live code required, no double admission, cancelled refused", async () => {
  const owner = await user("organizer");
  const other = await user("organizer");
  const a1 = await user("attendee");
  const a2 = await user("attendee");
  const ev = await createEvent(owner.token, { capacity: 5 });
  await book(a1.token, ev._id);
  const b2 = (await book(a2.token, ev._id)).json.data;
  const [t1] = (await api("/tickets/my", { token: a1.token })).json.data;
  const [t2] = (await api("/tickets/my", { token: a2.token })).json.data;
  const t2Code = await doorCode(t2._id);
  await api(`/bookings/${b2._id}/cancel`, { method: "PATCH", token: a2.token });

  const checkIn = (token: string, code: string) => post("/tickets/check-in", token, { eventId: ev._id, code });
  const live = await doorCode(t1._id);
  assert.equal((await checkIn(a1.token, live)).status, 403); // attendees cannot
  assert.equal((await checkIn(other.token, live)).status, 403); // not their event
  assert.equal((await checkIn(owner.token, "EH1:ZZZZZZ:123456")).status, 404);
  assert.equal((await checkIn(owner.token, "not a code")).status, 400);
  assert.equal((await checkIn(owner.token, t2Code)).status, 409); // cancelled

  const secret = (await Ticket.findById(t1._id).select("+secret"))!.secret;
  const stale = `${t1.ref} ${codeAt(secret, stepAt(Date.now()) - 3)}`; // a screenshot from 90s ago
  assert.match((await checkIn(owner.token, stale)).json.error ?? "", /expired/);

  const ok = await checkIn(owner.token, live.toLowerCase().replace("eh1:", "").replace(":", " "));
  assert.equal(ok.status, 200, ok.json.error);
  assert.ok(ok.json.data.checkedInAt);
  const again = await checkIn(owner.token, await doorCode(t1._id));
  assert.equal(again.status, 409);
  assert.match(again.json.error ?? "", /Already checked in/);
});

test("ticket transfer re-keys the QR, notifies the recipient, and blocks cancelling the booking", async () => {
  const org = await user("organizer");
  const buyer = await user("attendee");
  const friend = await user("attendee");
  const ev = await createEvent(org.token, { capacity: 4 });
  const booking = (await book(buyer.token, ev._id, { quantity: 2 })).json.data;
  const [ticket] = (await api("/tickets/my", { token: buyer.token })).json.data;
  const oldCode = await doorCode(ticket._id);

  assert.equal((await post(`/tickets/${ticket._id}/transfer`, friend.token, { email: buyer.email })).status, 403);
  assert.equal((await post(`/tickets/${ticket._id}/transfer`, buyer.token, { email: "nobody@test.io" })).status, 404);
  const moved = await post(`/tickets/${ticket._id}/transfer`, buyer.token, { email: friend.email });
  assert.equal(moved.status, 200, moved.json.error);
  assert.notEqual(moved.json.data.ref, ticket.ref);

  const friendTickets = (await api("/tickets/my", { token: friend.token })).json.data;
  assert.equal(friendTickets.length, 1);
  assert.equal((await api("/tickets/my", { token: buyer.token })).json.data.length, 1);
  assert.equal((await post("/tickets/check-in", org.token, { eventId: ev._id, code: oldCode })).status, 404, "the sender's QR is dead");
  assert.equal((await post("/tickets/check-in", org.token, { eventId: ev._id, code: await doorCode(friendTickets[0]._id) })).status, 200);

  const inbox = (await api("/me/notifications", { token: friend.token })).json.data;
  assert.equal(inbox.unread, 1);
  assert.equal(inbox.items[0].kind, "ticket_received");
  assert.equal((await api(`/bookings/${booking._id}/cancel`, { method: "PATCH", token: buyer.token })).status, 409);
});

test("approval events: request holds seats, secret address hidden until approved, decline frees seats", async () => {
  const host = await user("organizer");
  const guest = await user("attendee");
  const other = await user("attendee");
  const ev = await createEvent(host.token, {
    capacity: 1, price: 500, requiresApproval: true, secretLocation: true, address: "Flat 4, Hidden Lane",
    questions: [{ label: "Why do you want to come?", required: true }],
  });
  assert.equal((await api(`/events/${ev._id}`)).json.data.address, undefined);
  assert.equal((await book(guest.token, ev._id)).status, 400, "required question");
  const qid = ev.questions[0]._id;
  const req = await book(guest.token, ev._id, { answers: [{ questionId: qid, answer: "I love dumplings" }] });
  assert.equal(req.status, 201, req.json.error);
  assert.equal(req.json.data.status, "pending");
  assert.equal(req.json.data.transactionId, undefined, "not charged until approved");
  assert.equal((await api("/tickets/my", { token: guest.token })).json.data.length, 0);
  assert.equal((await book(other.token, ev._id)).status, 400, "seat is held while pending (sold out)");

  const hostInbox = (await api("/me/notifications", { token: host.token })).json.data;
  assert.equal(hostInbox.items[0].kind, "booking_request");

  assert.equal((await patch(`/bookings/${req.json.data._id}/approve`, guest.token)).status, 403);
  const approved = await patch(`/bookings/${req.json.data._id}/approve`, host.token);
  assert.equal(approved.status, 200, approved.json.error);
  assert.equal(approved.json.data.status, "confirmed");
  assert.ok(approved.json.data.transactionId);
  assert.equal((await patch(`/bookings/${req.json.data._id}/approve`, host.token)).status, 409, "only once");
  assert.equal((await api(`/events/${ev._id}`, { token: guest.token })).json.data.address, "Flat 4, Hidden Lane");
  assert.equal((await api(`/events/${ev._id}`, { token: other.token })).json.data.address, undefined);

  // A second event to show decline releases the seat
  const ev2 = await createEvent(host.token, { capacity: 1, requiresApproval: true });
  const r2 = (await book(other.token, ev2._id)).json.data;
  const declined = await patch(`/bookings/${r2._id}/decline`, host.token);
  assert.equal(declined.json.data.status, "declined");
  assert.equal((await api(`/events/${ev2._id}`)).json.data.bookedCount, 0);
});

test("waitlist: join only when sold out, promoted in order on cancel, parties that don't fit are skipped", async () => {
  const host = await user("organizer");
  const [holder, w1, w2, w3] = await Promise.all([user("attendee"), user("attendee"), user("attendee"), user("attendee")]);
  const ev = await createEvent(host.token, { capacity: 2, price: 200 });
  assert.equal((await post(`/events/${ev._id}/waitlist`, w1.token, { quantity: 1 })).status, 409, "tickets still available");
  const holding = (await book(holder.token, ev._id, { quantity: 2 })).json.data;

  assert.equal((await post(`/events/${ev._id}/waitlist`, w1.token, { quantity: 3 })).status, 201); // won't fit 2 seats
  const j2 = await post(`/events/${ev._id}/waitlist`, w2.token, { quantity: 2 });
  assert.equal(j2.json.data.position, 2);
  await post(`/events/${ev._id}/waitlist`, w3.token, { quantity: 1 });
  assert.equal((await post(`/events/${ev._id}/waitlist`, w2.token, { quantity: 1 })).status, 409, "already in line");
  assert.equal((await api(`/events/${ev._id}/social`)).json.data.waiting, 3);

  await api(`/bookings/${holding._id}/cancel`, { method: "PATCH", token: holder.token });

  const w2Bookings = (await api("/bookings/my", { token: w2.token })).json.data;
  assert.equal(w2Bookings.length, 1, "w2 (party of 2) got the two freed seats");
  assert.equal(w2Bookings[0].viaWaitlist, true);
  assert.equal(w2Bookings[0].protection, true);
  assert.equal(w2Bookings[0].pricing.protection, 0, "protection is free for waitlist bookings");
  assert.equal(w2Bookings[0].tickets.length, 2);
  assert.equal((await api("/bookings/my", { token: w1.token })).json.data.length, 0, "w1's party of 3 didn't fit");
  assert.equal((await api("/bookings/my", { token: w3.token })).json.data.length, 0, "no seats left for w3");
  assert.equal((await api("/me/notifications", { token: w2.token })).json.data.items[0].kind, "waitlist_promoted");
  assert.equal((await api(`/events/${ev._id}/viewer`, { token: w3.token })).json.data.waitlist.position, 2);
});

test("event edits: capacity can't drop below sales; date change notifies holders; capacity increase promotes the waitlist", async () => {
  const host = await user("organizer");
  const [fan, waiter] = await Promise.all([user("attendee"), user("attendee")]);
  const ev = await createEvent(host.token, { capacity: 2 });
  await book(fan.token, ev._id, { quantity: 2 });
  await post(`/events/${ev._id}/waitlist`, waiter.token, { quantity: 1 });
  const tier = ev.tiers[0];
  const put = (body: unknown) => api(`/events/${ev._id}`, { method: "PUT", token: host.token, body });

  assert.match((await put({ tiers: [{ ...tier, capacity: 1 }] })).json.error ?? "", /already sold/);
  assert.match((await put({ tiers: [{ name: "Other", price: 50, capacity: 5 }] })).json.error ?? "", /can't be removed/);
  const grown = await put({ tiers: [{ ...tier, capacity: 3 }], date: inDays(9).toISOString() });
  assert.equal(grown.status, 200, grown.json.error);
  assert.equal(grown.json.data.capacity, 3);

  assert.equal((await api("/me/notifications", { token: fan.token })).json.data.items[0].kind, "event_updated");
  assert.equal((await api("/bookings/my", { token: waiter.token })).json.data[0].status, "confirmed", "promoted into the new seat");
});

test("host cancels the event: everyone refunded in full, tickets voided, notified", async () => {
  const host = await user("organizer");
  const fan = await user("attendee");
  const ev = await createEvent(host.token, { capacity: 5, price: 400 });
  const b = (await book(fan.token, ev._id, { quantity: 2 })).json.data;
  assert.equal((await api(`/events/${ev._id}`, { method: "DELETE", token: host.token })).status, 409, "booked events are cancelled, not deleted");
  const res = await post(`/events/${ev._id}/cancel`, host.token);
  assert.equal(res.status, 200, res.json.error);
  assert.equal(res.json.data.status, "cancelled");
  const mine = (await api("/bookings/my", { token: fan.token })).json.data[0];
  assert.equal(mine.status, "cancelled");
  assert.equal(mine.refundAmount, b.pricing.total, "fees included");
  assert.ok(mine.tickets.every((t: { status: string }) => t.status === "void"));
  assert.equal((await api("/me/notifications", { token: fan.token })).json.data.items[0].kind, "event_cancelled");
});

test("reviews need a ticket and an ended event; the host can reply; stats are computed", async () => {
  const host = await user("organizer");
  const u1 = await user("attendee");
  const u2 = await user("attendee");
  const past = await Event.create({ ...eventBody({ date: inDays(-2) }), tiers: [{ name: "General", price: 10, capacity: 5, remaining: 4 }], organizerId: host.id });
  const future = await createEvent(host.token, { capacity: 5 });
  await Ticket.create({ bookingId: new mongoose.Types.ObjectId(), eventId: past._id, ownerId: u1.id, holderName: "U1", tierName: "General", ref: "AAAAAA", secret: "00" });
  const body = (eventId: unknown) => ({ eventId: String(eventId), rating: 4, comment: "Great" });

  assert.equal((await post("/reviews", u1.token, body(future._id))).status, 400); // not ended
  assert.equal((await post("/reviews", u2.token, body(past._id))).status, 403); // did not attend
  const created = await post("/reviews", u1.token, body(past._id));
  assert.equal(created.status, 201);
  assert.equal((await post("/reviews", u1.token, body(past._id))).status, 409); // one per user
  assert.equal((await patch(`/reviews/${created.json.data._id}/reply`, u1.token, { body: "Me again" })).status, 403);
  assert.equal((await patch(`/reviews/${created.json.data._id}/reply`, host.token, { body: "Thanks for coming!" })).status, 200);

  const stats = (await api(`/reviews/event/${past._id}`)).json.data;
  assert.equal(stats.averageRating, 4);
  assert.equal(stats.reviewCount, 1);
  assert.equal(stats.reviews[0].reply.body, "Thanks for coming!");
  assert.equal((await api("/me/notifications", { token: host.token })).json.data.items[0].kind, "new_review");
});

test("listing filters by city, searches, sorts and paginates published events", async () => {
  await Event.deleteMany({});
  const org = new mongoose.Types.ObjectId();
  const tier = (price: number) => [{ name: "General", price, capacity: 50, remaining: 50 }];
  await Event.create([
    { ...eventBody({ title: "Jazz Night", category: "music", date: inDays(3), location: "Mumbai", price: 199 }), tiers: tier(199), bookedCount: 1, organizerId: org },
    { ...eventBody({ title: "Rust Workshop", category: "tech", eventType: "online", location: "Online", date: inDays(10), price: 0 }), tiers: tier(0), organizerId: org },
    { ...eventBody({ title: "Hidden Draft", category: "tech", status: "draft" }), tiers: tier(10), organizerId: org },
    { ...eventBody({ title: "Old Gig", category: "music", date: inDays(-3) }), tiers: tier(10), organizerId: org },
    { ...eventBody({ title: "Pricey Gala", category: "business", date: inDays(5), location: "mumbai", price: 4999, capacity: 50 }), tiers: tier(4999), bookedCount: 40, organizerId: org },
  ]);
  const titles = async (qs: string) => (await api(`/events?${qs}`)).json.data.map((e: { title: string }) => e.title);
  const page = await api("/events?limit=1");
  assert.deepEqual(page.json.pagination, { total: 3, page: 1, limit: 1, pages: 3 });
  assert.deepEqual(await titles("q=jazz"), ["Jazz Night"]);
  assert.deepEqual(await titles("city=Mumbai"), ["Jazz Night", "Pricey Gala"], "city match ignores case");
  assert.deepEqual(await titles("city=Online"), ["Rust Workshop"]);
  assert.deepEqual(await titles("sort=price-asc"), ["Rust Workshop", "Jazz Night", "Pricey Gala"]);
  assert.deepEqual(await titles("sort=popular"), ["Pricey Gala", "Jazz Night", "Rust Workshop"]);
  assert.deepEqual(await titles("maxPrice=0"), ["Rust Workshop"]);
  assert.deepEqual(await titles(`to=${new Date().toISOString().slice(0, 10)}`), ["Old Gig"], "past via an explicit window");
  const cities = (await api("/events/cities")).json.data;
  assert.ok(cities.some((c: { city: string; count: number }) => c.city === "Online" && c.count === 1));
  assert.equal((await api("/events?category=bogus")).status, 400);
  assert.equal((await api("/events/not-an-id")).status, 400);
});

test("saved events: save is idempotent, list and ids reflect it, unsave removes it; interested count follows", async () => {
  const org = await user("organizer");
  const fan = await user("attendee");
  const ev = await createEvent(org.token, { title: "Saved Show" });

  assert.equal((await api(`/me/saved/${ev._id}`, { method: "PUT" })).status, 401); // must be signed in
  assert.equal((await api(`/me/saved/${ev._id}`, { method: "PUT", token: fan.token })).status, 200);
  assert.equal((await api(`/me/saved/${ev._id}`, { method: "PUT", token: fan.token })).status, 200); // twice is fine
  assert.deepEqual((await api("/me/saved/ids", { token: fan.token })).json.data, [ev._id]);
  assert.equal((await api(`/events/${ev._id}/social`)).json.data.interested, 1);
  assert.equal((await api("/me/saved/000000000000000000000000", { method: "PUT", token: fan.token })).status, 404);

  assert.equal((await api(`/me/saved/${ev._id}`, { method: "DELETE", token: fan.token })).status, 200);
  assert.deepEqual((await api("/me/saved/ids", { token: fan.token })).json.data, []);
});

test("following a host: profile page, follower count, and new events notify followers", async () => {
  const host = await user("organizer");
  const fan = await user("attendee");
  assert.equal((await api(`/me/following/${fan.id}`, { method: "PUT", token: host.token })).status, 404, "only hosts can be followed");
  assert.equal((await api(`/me/following/${host.id}`, { method: "PUT", token: fan.token })).status, 200);
  await createEvent(host.token, { title: "Brand New Show" });
  const note = (await api("/me/notifications", { token: fan.token })).json.data.items[0];
  assert.equal(note.kind, "new_event");
  assert.match(note.title, /Brand New Show/);

  const profile = (await api(`/hosts/${host.id}`)).json.data;
  assert.equal(profile.followers, 1);
  assert.equal(profile.upcoming[0].title, "Brand New Show");
  assert.equal(profile.host.email, undefined, "no emails on public profiles");
  assert.equal((await api(`/hosts/${fan.id}`)).status, 404);
});

test("announcements reach ticket holders only; reminders appear for events starting within a day", async () => {
  const host = await user("organizer");
  const fan = await user("attendee");
  const stranger = await user("attendee");
  const ev = await createEvent(host.token, { capacity: 5, date: new Date(Date.now() + 3 * 3_600_000).toISOString() });
  await book(fan.token, ev._id);
  assert.equal((await post(`/events/${ev._id}/announcements`, fan.token, { body: "hi" })).status, 403);
  assert.equal((await post(`/events/${ev._id}/announcements`, host.token, { body: "Doors at 7" })).status, 201);
  const locked = (await api(`/events/${ev._id}/announcements`, { token: stranger.token })).json.data;
  assert.deepEqual([locked.locked, locked.count, locked.items.length], [true, 1, 0]);
  assert.equal((await api(`/events/${ev._id}/announcements`, { token: fan.token })).json.data.items[0].body, "Doors at 7");

  const kinds = (await api("/me/notifications", { token: fan.token })).json.data.items.map((i: { kind: string }) => i.kind);
  assert.deepEqual(kinds.sort(), ["announcement", "reminder"]);
  await api("/me/notifications", { token: fan.token }); // reading again doesn't duplicate the reminder
  assert.equal((await api("/me/notifications/unread", { token: fan.token })).json.data.unread, 2);
  await post("/me/notifications/read", fan.token);
  assert.equal((await api("/me/notifications/unread", { token: fan.token })).json.data.unread, 0);
});

test("organizer analytics and stats: daily sales, tiers, referrers, check-in rate", async () => {
  const owner = await user("organizer");
  const [fan, friend] = await Promise.all([user("attendee"), user("attendee")]);
  const ev = await createEvent(owner.token, { tiers: [{ name: "General", price: 300, capacity: 10 }, { name: "VIP", price: 900, capacity: 2 }] });
  await book(fan.token, ev._id, { tierId: ev.tiers[1]._id });
  await book(friend.token, ev._id, { quantity: 2, ref: fan.id });

  assert.equal((await api("/events/my/stats", { token: fan.token })).status, 403);
  const stats = (await api("/events/my/stats?days=14", { token: owner.token })).json.data;
  assert.equal(stats.daily.length, 14);
  const today = stats.daily[stats.daily.length - 1];
  assert.deepEqual([today.bookings, today.tickets, today.revenue], [2, 3, 1500]);

  const a = (await api(`/events/${ev._id}/analytics`, { token: owner.token })).json.data;
  assert.equal(a.revenue, 1500);
  assert.deepEqual(a.tiers.map((t: { sold: number; revenue: number }) => [t.sold, t.revenue]), [[2, 600], [1, 900]]);
  assert.deepEqual(a.referrers, [{ name: (await User.findById(fan.id))!.name, bookings: 1, tickets: 2 }]);
  assert.deepEqual(a.checkIn, { total: 3, checkedIn: 0 });
  assert.equal(a.daily.length, 30);
});

test("recent reviews are public, include reviewer and event, and skip deleted events", async () => {
  const reviewer = await user("attendee");
  const kept = await Event.create({ ...eventBody({ title: "Kept Gig", date: inDays(-3) }), tiers: [{ name: "General", price: 10, capacity: 5, remaining: 5 }], organizerId: new mongoose.Types.ObjectId() });
  const gone = await Event.create({ ...eventBody({ title: "Gone Gig", date: inDays(-2) }), tiers: [{ name: "General", price: 10, capacity: 5, remaining: 5 }], organizerId: new mongoose.Types.ObjectId() });
  for (const ev of [kept, gone]) await Review.create({ userId: reviewer.id, eventId: ev._id, rating: 5, comment: `Loved ${ev.title}` });
  await Event.deleteOne({ _id: gone._id });

  const recent = await api("/reviews/recent?limit=5");
  assert.equal(recent.status, 200);
  const titles = recent.json.data.map((r: { eventId: { title: string } }) => r.eventId.title);
  assert.ok(titles.includes("Kept Gig"));
  assert.ok(!titles.includes("Gone Gig"));
  assert.equal(typeof recent.json.data[0].userId.name, "string");
});

test("admin: platform stats and verifying hosts; profile edits re-issue the token", async () => {
  const host = await user("organizer");
  const fan = await user("attendee");
  await User.create({ name: "Root", email: "root@test.io", password: await (await import("bcryptjs")).default.hash("secret123", 4), role: "admin" });
  const admin = (await api("/auth/login", { method: "POST", body: { email: "root@test.io", password: "secret123" } })).json.data.token;

  assert.equal((await api("/admin/stats", { token: fan.token })).status, 403);
  const stats = (await api("/admin/stats", { token: admin })).json.data;
  assert.ok(stats.users.organizer >= 1);
  assert.equal((await patch(`/admin/hosts/${fan.id}`, admin, { verified: true })).status, 404);
  assert.equal((await patch(`/admin/hosts/${host.id}`, admin, { verified: true })).json.data.verified, true);
  assert.equal((await api(`/hosts/${host.id}`)).json.data.host.verified, true);

  const edited = await patch("/auth/profile", fan.token, { name: "Fan Renamed", city: "Pune", bio: "Hi" });
  assert.equal(edited.status, 200, edited.json.error);
  assert.equal(edited.json.data.user.name, "Fan Renamed");
  const payload = JSON.parse(Buffer.from(edited.json.data.token.split(".")[1], "base64url").toString());
  assert.equal(payload.name, "Fan Renamed");
});

test("bug bash: public lists never leak secret addresses, join links or host emails", async () => {
  const host = await user("organizer");
  const secret = await createEvent(host.token, { title: "Hidden Dinner", requiresApproval: true, secretLocation: true, address: "Flat 9, Secret Lane" });
  const online = await createEvent(host.token, { title: "Zoom Talk", eventType: "online", location: "Online", address: undefined, meetingLink: "https://zoom.us/j/123" });
  const fan = await user("attendee");
  await api(`/me/saved/${secret._id}`, { method: "PUT", token: fan.token });
  await api(`/me/following/${host.id}`, { method: "PUT", token: fan.token });
  const lists = [
    (await api("/events?limit=50")).json.data,
    (await api(`/hosts/${host.id}`)).json.data.upcoming,
    (await api("/me/saved", { token: fan.token })).json.data,
  ];
  for (const list of lists) {
    const text = JSON.stringify(list);
    assert.ok(!text.includes("Secret Lane") && !text.includes("zoom.us/j/123") && !text.includes(host.email), text.slice(0, 200));
  }
  assert.equal((await api(`/events/${online._id}`)).json.data.organizerId.email, undefined);
  const draft = await createEvent(host.token, { status: "draft" });
  assert.equal((await api(`/me/saved/${draft._id}`, { method: "PUT", token: fan.token })).status, 404, "drafts can't be saved");
});

test("bug bash: promo uses come back on decline and cancel; refunds follow the policy sold; no cancel after check-in", async () => {
  const host = await user("organizer");
  const [a, b] = await Promise.all([user("attendee"), user("attendee")]);
  const ev = await createEvent(host.token, { capacity: 5, price: 500, requiresApproval: true, promoCodes: [{ code: "TWICE", kind: "flat", amount: 100, limit: 2 }] });
  const promoUsed = async () => (await api(`/events/${ev._id}`, { token: host.token })).json.data.promoCodes[0].remaining;
  const req = (await book(a.token, ev._id, { promoCode: "TWICE" })).json.data;
  assert.equal(await promoUsed(), 1);
  await patch(`/bookings/${req._id}/decline`, host.token);
  assert.equal(await promoUsed(), 2, "declining returns the promo use");
  const req2 = (await book(b.token, ev._id, { promoCode: "TWICE" })).json.data;
  await api(`/bookings/${req2._id}/cancel`, { method: "PATCH", token: b.token });
  assert.equal(await promoUsed(), 2, "withdrawing returns it too");

  // Policy snapshot: bought under flexible, host switches to strict, the guest still gets the flexible refund
  const ev2 = await createEvent(host.token, { capacity: 5, price: 400 });
  const paid = (await book(a.token, ev2._id)).json.data;
  await api(`/events/${ev2._id}`, { method: "PUT", token: host.token, body: { refundPolicy: "strict" } });
  assert.equal((await api(`/bookings/${paid._id}/cancel`, { method: "PATCH", token: a.token })).json.data.refundAmount, 400);

  // Checked in: no cancelling for a refund
  const used = (await book(b.token, ev2._id, { protection: true })).json.data;
  const [ticket] = (await api("/tickets/my", { token: b.token })).json.data.filter((t: { eventId: { _id: string } }) => t.eventId._id === ev2._id);
  assert.equal((await post(`/tickets/${ticket._id}/admit`, host.token)).status, 200);
  assert.equal((await api(`/bookings/${used._id}/cancel`, { method: "PATCH", token: b.token })).status, 409);
});

test("bug bash: approve racing a cancel always ends consistent", async () => {
  const host = await user("organizer");
  const ev = await createEvent(host.token, { capacity: 20, price: 300, requiresApproval: true });
  const guests = await Promise.all(Array.from({ length: 6 }, () => user("attendee")));
  for (const g of guests) {
    const req = (await book(g.token, ev._id)).json.data;
    await Promise.all([patch(`/bookings/${req._id}/approve`, host.token), api(`/bookings/${req._id}/cancel`, { method: "PATCH", token: g.token })]);
    const bk = await Booking.findById(req._id);
    const valid = await Ticket.countDocuments({ bookingId: req._id, status: "valid" });
    if (bk!.status === "cancelled") assert.equal(valid, 0, "a cancelled booking has no working tickets");
    else assert.equal(bk!.status === "confirmed" ? valid : 0, bk!.status === "confirmed" ? 1 : 0);
  }
  const live = (await api(`/events/${ev._id}`)).json.data;
  const held = await Booking.aggregate([{ $match: { eventId: new mongoose.Types.ObjectId(ev._id), status: { $in: ["pending", "confirmed"] } } }, { $group: { _id: null, n: { $sum: "$quantity" } } }]);
  assert.equal(live.bookedCount, held[0]?.n ?? 0, "seat count matches the bookings holding seats");
});

test("bug bash: dates, prices, self-reviews and transfers to the host", async () => {
  const host = await user("organizer");
  const fan = await user("attendee");
  assert.match((await post("/events", host.token, eventBody({ price: 5 }))).json.error ?? "", /start at ₹20/);
  const ev = await createEvent(host.token, { capacity: 3 });
  assert.equal((await api(`/events/${ev._id}`, { method: "PUT", token: host.token, body: { date: "2020-01-01" } })).status, 400, "no moving into the past");
  assert.equal((await api(`/events/${ev._id}`, { method: "PUT", token: host.token, body: { title: "Still fine" } })).status, 200);
  const old = await Event.create({ ...eventBody({ date: inDays(-1), status: "draft" }), tiers: [{ name: "General", price: 100, capacity: 5, remaining: 5 }], organizerId: host.id });
  assert.match((await api(`/events/${old._id}`, { method: "PUT", token: host.token, body: { status: "published" } })).json.error ?? "", /future/);

  await book(fan.token, ev._id);
  const [t] = (await api("/tickets/my", { token: fan.token })).json.data;
  assert.equal((await post(`/tickets/${t._id}/transfer`, fan.token, { email: host.email })).status, 400);
  const past = await Event.create({ ...eventBody({ date: inDays(-2) }), tiers: [{ name: "General", price: 100, capacity: 5, remaining: 5 }], organizerId: host.id });
  await Ticket.create({ bookingId: new mongoose.Types.ObjectId(), eventId: past._id, ownerId: host.id, holderName: "Host", tierName: "General", ref: "HOSTAA", secret: "00" });
  assert.equal((await post("/reviews", host.token, { eventId: String(past._id), rating: 5, comment: "Me!" })).status, 403);
});

test("bug bash: 'from' filters use Indian days and skip events that already started", async () => {
  await Event.deleteMany({});
  const org = new mongoose.Types.ObjectId();
  const tier = [{ name: "General", price: 100, capacity: 5, remaining: 5 }];
  // 23:00 IST tonight is 17:30 UTC; an event 2 hours ago has already started
  const ist = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const lateTonight = new Date(`${ist}T17:30:00.000Z`);
  await Event.create([
    { ...eventBody({ title: "Started", date: new Date(Date.now() - 2 * 3_600_000) }), tiers: tier, organizerId: org },
    { ...eventBody({ title: "Late tonight", date: lateTonight }), tiers: tier, organizerId: org },
  ]);
  const titles = (await api(`/events?from=${ist}&to=${ist}`)).json.data.map((e: { title: string }) => e.title);
  assert.ok(!titles.includes("Started"));
  if (lateTonight.getTime() > Date.now()) assert.ok(titles.includes("Late tonight"), "an 11pm IST event is still 'today' in India");
});

test("new: page views give hosts a conversion rate; duplicating makes a fresh draft; saved-event alerts", async () => {
  const host = await user("organizer");
  const fan = await user("attendee");
  const ev = await createEvent(host.token, {
    tiers: [{ name: "Early bird", price: 200, capacity: 10, salesEnd: new Date(Date.now() + 6 * 3_600_000).toISOString() }, { name: "General", price: 300, capacity: 2 }],
    promoCodes: [{ code: "AGAIN", kind: "percent", amount: 10, limit: 5 }],
    questions: [{ label: "Size?", required: false }],
  });
  for (let i = 0; i < 4; i++) await post(`/events/${ev._id}/view`, "");
  await book(fan.token, ev._id, { promoCode: "AGAIN" });
  const a = (await api(`/events/${ev._id}/analytics`, { token: host.token })).json.data;
  assert.equal(a.views, 4);
  assert.equal(a.conversion, 25, "1 booking from 4 views");

  const copy = await post(`/events/${ev._id}/duplicate`, host.token);
  assert.equal(copy.status, 201, copy.json.error);
  assert.equal(copy.json.data.status, "draft");
  assert.equal(copy.json.data.bookedCount, 0);
  assert.deepEqual(copy.json.data.tiers.map((t: { remaining: number; capacity: number }) => t.remaining === t.capacity), [true, true]);
  assert.equal(new Date(copy.json.data.date).getTime() - new Date(ev.date).getTime(), 7 * 86_400_000, "same time next week");
  assert.equal((await post(`/events/${ev._id}/duplicate`, fan.token)).status, 403);

  // A watcher (saved, no ticket) hears that the early bird ends today; the General tier then nearly sells out
  const watcher = await user("attendee");
  await api(`/me/saved/${ev._id}`, { method: "PUT", token: watcher.token });
  const kinds = async () => (await api("/me/notifications", { token: watcher.token })).json.data.items.map((n: { kind: string }) => n.kind);
  assert.ok((await kinds()).includes("price_ending"));
  await api("/me/notifications", { token: watcher.token });
  assert.equal((await kinds()).filter((k: string) => k === "price_ending").length, 1, "sent once");
  assert.ok(!(await api("/me/notifications", { token: fan.token })).json.data.items.some((n: { kind: string }) => n.kind === "price_ending"), "not for people already going");
});

test("new: ask the host — private until answered, notifications both ways, limits and permissions", async () => {
  const host = await user("organizer");
  const otherHost = await user("organizer");
  const guest = await user("attendee");
  const stranger = await user("attendee");
  const ev = await createEvent(host.token);
  const ask = (token: string, body: string) => post(`/events/${ev._id}/qa`, token, { body });
  const list = async (token?: string) => (await api(`/events/${ev._id}/qa`, { token })).json.data.map((q: { body: string }) => q.body);

  const q = await ask(guest.token, "Is there parking?");
  assert.equal(q.status, 201, q.json.error);
  assert.equal(q.json.data.userId.name, "User " + (n - 1));
  assert.equal((await ask(host.token, "Talking to myself")).status, 400);
  assert.equal((await api(`/me/notifications`, { token: host.token })).json.data.items[0].kind, "question");

  assert.deepEqual(await list(), [], "unanswered questions are not public");
  assert.deepEqual(await list(stranger.token), []);
  assert.deepEqual(await list(guest.token), ["Is there parking?"], "the asker sees their own");
  assert.deepEqual(await list(host.token), ["Is there parking?"], "the host sees everything");

  assert.equal((await post(`/events/${ev._id}/qa/${q.json.data._id}/answer`, otherHost.token, { body: "Nope" })).status, 403);
  const a = await post(`/events/${ev._id}/qa/${q.json.data._id}/answer`, host.token, { body: "Yes, behind the hall." });
  assert.equal(a.status, 200, a.json.error);
  assert.equal(a.json.data.answer.body, "Yes, behind the hall.");
  assert.deepEqual(await list(), ["Is there parking?"], "answered questions are public");
  assert.equal((await api(`/me/notifications`, { token: guest.token })).json.data.items[0].kind, "answer");

  for (const body of ["One?", "Two?", "Three?"]) assert.equal((await ask(guest.token, body)).status, 201);
  assert.equal((await ask(guest.token, "Four?")).status, 429, "three waiting questions at most");

  const other = await createEvent(host.token);
  assert.equal((await post(`/events/${other._id}/qa/${q.json.data._id}/answer`, host.token, { body: "x" })).status, 404, "question belongs to another event");
  assert.equal((await api(`/events/${ev._id}/qa/${q.json.data._id}`, { method: "DELETE", token: stranger.token })).status, 403);
  assert.equal((await api(`/events/${ev._id}/qa/${q.json.data._id}`, { method: "DELETE", token: guest.token })).status, 200);
  assert.deepEqual(await list(), []);
});

test("new: door team helpers check guests in, see no contact details, and lose access when removed", async () => {
  const host = await user("organizer");
  const helper = await user("attendee");
  const guest = await user("attendee");
  const ev = await createEvent(host.token, { capacity: 5 });
  const booked = await book(guest.token, ev._id, { quantity: 2 });
  assert.equal(booked.status, 201, booked.json.error);
  const [t1, t2] = (await Ticket.find({ bookingId: booked.json.data._id })).map((t) => ({ _id: String(t._id) }));
  const checkIn = async (token: string, ticketId: string) => post("/tickets/check-in", token, { eventId: ev._id, code: await doorCode(ticketId) });

  assert.equal((await checkIn(helper.token, t1._id)).status, 403, "not on the team yet");
  assert.equal((await post(`/events/${ev._id}/team`, host.token, { email: "nobody@test.io" })).status, 404);
  assert.equal((await post(`/events/${ev._id}/team`, host.token, { email: host.email })).status, 400);
  const added = await post(`/events/${ev._id}/team`, host.token, { email: helper.email });
  assert.equal(added.status, 201, added.json.error);
  assert.deepEqual(added.json.data.map((m: { _id: string }) => m._id), [helper.id]);
  assert.equal((await post(`/events/${ev._id}/team`, host.token, { email: helper.email })).status, 409);
  assert.equal((await post(`/events/${ev._id}/team`, helper.token, { email: guest.email })).status, 403, "helpers can't grow the team");
  assert.equal((await api("/me/notifications", { token: helper.token })).json.data.items[0].kind, "door_team");
  assert.equal((await api(`/events/${ev._id}`)).json.data.team, undefined, "the team is not public");

  assert.deepEqual((await api("/me/door", { token: helper.token })).json.data.map((e: { _id: string }) => e._id), [ev._id]);
  const desk = (await api(`/events/${ev._id}/door`, { token: helper.token })).json.data;
  assert.equal(desk.isHost, false);
  assert.equal(desk.guests.length, 2);
  assert.ok(!JSON.stringify(desk).includes(guest.email), "no guest emails at the door");
  assert.equal((await api(`/events/${ev._id}/door`, { token: guest.token })).status, 403);

  const scanned = await checkIn(helper.token, t1._id);
  assert.equal(scanned.status, 200, scanned.json.error);
  assert.ok(!JSON.stringify(scanned.json.data).includes(guest.email));
  assert.equal((await api(`/events/${ev._id}/analytics`, { token: helper.token })).status, 403, "no money for helpers");
  assert.equal((await api(`/bookings/event/${ev._id}`, { token: helper.token })).status, 403);

  const removed = await api(`/events/${ev._id}/team/${helper.id}`, { method: "DELETE", token: host.token });
  assert.deepEqual(removed.json.data, []);
  assert.equal((await checkIn(helper.token, t2._id)).status, 403, "access ends with removal");
  assert.equal((await post(`/tickets/${t2._id}/admit`, helper.token)).status, 403);
  assert.equal((await post(`/tickets/${t2._id}/admit`, host.token)).status, 200);
});

test("new: payouts are held until three days after the event, net of absorbed fees, plus money kept under strict refunds", async () => {
  const host = await user("organizer");
  const g1 = await user("attendee");
  const g2 = await user("attendee");
  const absorbed = await createEvent(host.token, { capacity: 10, absorbFees: true });
  const strict = await createEvent(host.token, { capacity: 10, refundPolicy: "strict" });
  await createEvent(host.token, { status: "draft" });
  assert.equal((await book(g1.token, absorbed._id, { quantity: 2 })).status, 201);
  const kept = await book(g2.token, strict._id);
  assert.equal((await patch(`/bookings/${kept.json.data._id}/cancel`, g2.token)).json.data.refundAmount ?? 0, 0, "strict: no refund");

  const payouts = async () => (await api("/events/my/payouts", { token: host.token })).json.data;
  let p = await payouts();
  assert.equal(p.events.length, 2, "drafts have nothing to pay");
  const row = (id: string) => p.events.find((e: { _id: string }) => e._id === id);
  // 2 × ₹100: fee 2.5% of 200 + ₹10 × 2 = ₹25, GST 18% = ₹4.50, both covered by the host
  assert.deepEqual(
    (({ status, tickets, sales, fees, payout }) => ({ status, tickets, sales, fees, payout }))(row(absorbed._id)),
    { status: "upcoming", tickets: 2, sales: 200, fees: 29.5, payout: 170.5 }
  );
  assert.equal(row(strict._id).kept, 100);
  assert.equal(row(strict._id).payout, 100);
  assert.equal(p.summary.upcoming, 270.5);

  await Event.updateOne({ _id: absorbed._id }, { date: inDays(-1) });
  await Event.updateOne({ _id: strict._id }, { date: inDays(-5) });
  p = await payouts();
  assert.equal(row(absorbed._id).status, "scheduled");
  assert.equal(row(strict._id).status, "paid");
  assert.match(row(strict._id).reference, /^PO-[0-9A-F]{8}$/);
  assert.deepEqual([p.summary.paid, p.summary.scheduled, p.summary.upcoming], [100, 170.5, 0]);
  assert.equal(p.summary.next.amount, 170.5);
  assert.equal((await api("/events/my/payouts", { token: g1.token })).status, 403);
});

test("new: picks for you follow hosts, taste and city; the passport counts past events and badges", async () => {
  const followed = await user("organizer");
  const other = await user("organizer");
  const fan = await user("attendee");
  assert.deepEqual((await api("/me/for-you", { token: fan.token })).json.data, [], "no signals, no picks");

  const fromFollowed = await createEvent(followed.token, { title: "Followed host night", category: "art", location: "Delhi" });
  const music = await createEvent(other.token, { title: "Saved gig", category: "music", location: "Delhi" });
  const moreMusic = await createEvent(other.token, { title: "Another gig", category: "music", location: "Delhi", capacity: 3 });
  const soldOut = await createEvent(other.token, { title: "Sold out gig", category: "music", location: "Delhi" });
  const local = await createEvent(other.token, { title: "Goa run", category: "sports", location: "Goa" });
  await createEvent(other.token, { title: "Unrelated", category: "business", location: "Delhi" });
  await Event.updateOne({ _id: soldOut._id }, { bookedCount: 1 });
  await api(`/me/following/${followed.id}`, { method: "PUT", token: fan.token });
  await api(`/me/saved/${music._id}`, { method: "PUT", token: fan.token });
  await User.updateOne({ _id: fan.id }, { city: "Goa" });

  const picks = (await api("/me/for-you", { token: fan.token })).json.data as { _id: string; title: string; reason: { kind: string } }[];
  const why = Object.fromEntries(picks.map((p) => [p.title, p.reason.kind]));
  assert.deepEqual(why, { "Followed host night": "host", "Goa run": "city", "Another gig": "category" });
  assert.equal(picks[0]._id, fromFollowed._id, "followed hosts rank first");
  assert.ok(!picks.some((p) => [music._id, soldOut._id].includes(p._id)), "saved and sold-out events are left out");

  // Passport: one past event (and a cancelled booking that doesn't count)
  assert.equal((await book(fan.token, moreMusic._id)).status, 201);
  const cancelled = await book(fan.token, local._id);
  await patch(`/bookings/${cancelled.json.data._id}/cancel`, fan.token);
  await Event.updateMany({ _id: { $in: [moreMusic._id, local._id] } }, { date: inDays(-3) });
  const pass = (await api("/me/passport", { token: fan.token })).json.data;
  assert.deepEqual(pass.stats, { events: 1, cities: 1, hosts: 1, upcoming: 0, reviews: 0, following: 1 });
  assert.deepEqual(pass.cities, ["Delhi"]);
  assert.deepEqual(pass.stamps.map((s: { title: string }) => s.title), ["Another gig"]);
  const badges = Object.fromEntries(pass.badges.map((b: { id: string; earned: boolean; value: number }) => [b.id, [b.earned, b.value]]));
  assert.deepEqual(badges.first, [true, 1]);
  assert.deepEqual(badges.regular, [false, 1]);
  assert.deepEqual(badges.fan, [false, 1]);
});

test("round 3: sales open on a schedule, savers hear when they do, and group discounts stack under promos", async () => {
  const host = await user("organizer");
  const fan = await user("attendee");
  const watcher = await user("attendee");
  const soon = new Date(Date.now() + 2 * 3_600_000);
  assert.equal((await post("/events", host.token, eventBody({ salesStart: inDays(8).toISOString() }))).status, 400, "sales must open before the event");
  const ev = await createEvent(host.token, {
    capacity: 10, salesStart: soon.toISOString(), groupDiscount: { minQty: 4, percent: 10 },
    promoCodes: [{ code: "GROUPY", kind: "percent", amount: 10, limit: 5 }],
  });
  const early = await book(fan.token, ev._id);
  assert.equal(early.status, 409);
  assert.match(early.json.error!, /go on sale/);
  assert.equal((await post(`/events/${ev._id}/quote`, "", { quantity: 1 })).status, 409);
  await api(`/me/saved/${ev._id}`, { method: "PUT", token: watcher.token }); // "Notify me"
  const kinds = async () => (await api("/me/notifications", { token: watcher.token })).json.data.items.map((x: { kind: string }) => x.kind);
  assert.ok(!(await kinds()).includes("on_sale"), "nothing before sales open");

  const opened = await api(`/events/${ev._id}`, { method: "PUT", token: host.token, body: { salesStart: new Date(Date.now() - 60_000).toISOString() } });
  assert.equal(opened.status, 200, opened.json.error);
  assert.deepEqual((await kinds()).filter((k: string) => k === "on_sale"), ["on_sale"]);
  assert.deepEqual((await kinds()).filter((k: string) => k === "on_sale"), ["on_sale"], "sent once");

  const quote = async (quantity: number, promoCode?: string) => (await post(`/events/${ev._id}/quote`, "", { quantity, promoCode })).json.data;
  assert.equal((await quote(3)).group, 0, "3 tickets: no group discount");
  const q = await quote(4, "GROUPY");
  assert.deepEqual([q.subtotal, q.group, q.discount], [400, 40, 76], "10% off 400, then 10% off the remaining 360");
  const b = await book(fan.token, ev._id, { quantity: 4, promoCode: "GROUPY" });
  assert.equal(b.status, 201, b.json.error);
  assert.equal(b.json.data.pricing.group, 40);
  assert.equal(b.json.data.amount, 324);

  const copy = (await post(`/events/${ev._id}/duplicate`, host.token)).json.data;
  assert.deepEqual(copy.groupDiscount, { minQty: 4, percent: 10 });
  const cleared = await api(`/events/${ev._id}`, { method: "PUT", token: host.token, body: { groupDiscount: null } });
  assert.equal(cleared.json.data.groupDiscount, null);
});

test("round 3: a host's audience lists bookers once each with regulars first; followers stay counts", async () => {
  const host = await user("organizer");
  const regular = await user("attendee");
  const once = await user("attendee");
  const fanOnly = await user("attendee");
  const a = await createEvent(host.token, { capacity: 5 });
  const b = await createEvent(host.token, { capacity: 5 });
  await book(regular.token, a._id);
  await book(regular.token, b._id, { quantity: 2 });
  await book(once.token, a._id);
  for (const u of [regular, fanOnly]) await api(`/me/following/${host.id}`, { method: "PUT", token: u.token });

  const res = (await api("/events/my/audience", { token: host.token })).json.data;
  assert.deepEqual(res.summary, { people: 2, regulars: 1, repeatRate: 50, followers: 2, averageSpend: 200 });
  assert.deepEqual(
    res.people.map((p: { email: string; events: number; tickets: number; spent: number; follows: boolean }) => [p.email, p.events, p.tickets, p.spent, p.follows]),
    [[regular.email, 2, 3, 300, true], [once.email, 1, 1, 100, false]]
  );
  assert.ok(!JSON.stringify(res).includes(fanOnly.email), "followers who never booked aren't listed");
  assert.equal((await api("/events/my/audience", { token: regular.token })).status, 403);
});

test("round 3: reports reach the admin queue; dismissing closes them, taking down refunds guests and tells everyone", async () => {
  const host = await user("organizer");
  const guest = await user("attendee");
  const r1 = await user("attendee");
  const r2 = await user("attendee");
  await User.create({ name: "Mod", email: "mod@test.io", password: await (await import("bcryptjs")).default.hash("secret123", 4), role: "admin" });
  const admin = (await api("/auth/login", { method: "POST", body: { email: "mod@test.io", password: "secret123" } })).json.data.token;
  const fine = await createEvent(host.token);
  const scam = await createEvent(host.token, { capacity: 5 });
  await book(guest.token, scam._id);
  const report = (token: string, targetId: string, reason = "scam", kind = "event") => post("/me/reports", token, { kind, targetId, reason });

  assert.equal((await report(r1.token, fine._id, "wrong_info")).status, 201);
  assert.equal((await report(r1.token, fine._id, "spam")).status, 409, "once per person");
  assert.equal((await report(host.token, fine._id)).status, 400, "not your own event");
  assert.equal((await report(r1.token, scam._id)).status, 201);
  assert.equal((await report(r2.token, scam._id)).status, 201);
  assert.equal((await api("/admin/reports", { token: r1.token })).status, 403);
  let queue = (await api("/admin/reports", { token: admin })).json.data;
  assert.deepEqual(queue.map((g: { targetId: string; reports: unknown[] }) => [g.targetId, g.reports.length]), [[scam._id, 2], [fine._id, 1]], "most reported first");

  const fineGroup = queue.find((g: { targetId: string }) => g.targetId === fine._id);
  assert.equal((await patch(`/admin/reports/${fineGroup._id}`, admin, { action: "dismiss" })).status, 200);
  assert.equal((await api(`/events/${fine._id}`)).json.data.status, "published", "dismissed: nothing changes");

  const scamGroup = (await api("/admin/reports", { token: admin })).json.data[0];
  const removed = await patch(`/admin/reports/${scamGroup._id}`, admin, { action: "remove" });
  assert.equal(removed.json.data.resolved, 2);
  assert.equal((await api(`/events/${scam._id}`)).json.data.status, "cancelled");
  assert.equal((await Booking.findOne({ eventId: scam._id }))!.status, "cancelled", "guests are refunded");
  const first = async (token: string) => (await api("/me/notifications", { token })).json.data.items[0];
  assert.match((await first(guest.token)).body, /EventHive removed this event/);
  assert.equal((await first(host.token)).kind, "event_removed");
  assert.equal((await first(r2.token)).kind, "report_resolved");
  assert.equal((await patch(`/admin/reports/${scamGroup._id}`, admin, { action: "remove" })).status, 409, "already handled");
  queue = (await api("/admin/reports", { token: admin })).json.data;
  assert.deepEqual(queue, []);

  // An answered (so public) question can be reported and removed too
  const asker = await user("attendee");
  const q = (await post(`/events/${fine._id}/qa`, asker.token, { body: "Buy cheap tickets at my site" })).json.data;
  await post(`/events/${fine._id}/qa/${q._id}/answer`, host.token, { body: "Please don't." });
  assert.equal((await report(asker.token, q._id, "spam", "question")).status, 400, "not your own question");
  assert.equal((await report(r1.token, q._id, "spam", "question")).status, 201);
  const qGroup = (await api("/admin/reports", { token: admin })).json.data[0];
  assert.equal(qGroup.question, "Buy cheap tickets at my site");
  await patch(`/admin/reports/${qGroup._id}`, admin, { action: "remove" });
  assert.deepEqual((await api(`/events/${fine._id}/qa`)).json.data, []);
});

test("round 3: the private calendar feed lists my events, marks cancellations, and dies when reset", async () => {
  const host = await user("organizer");
  const fan = await user("attendee");
  const ev = await createEvent(host.token, { title: "Feed Night, Live", capacity: 5 });
  const gone = await createEvent(host.token, { title: "Called Off", capacity: 5 });
  await book(fan.token, ev._id, { quantity: 2 });
  await book(fan.token, gone._id);
  await post(`/events/${gone._id}/cancel`, host.token);
  const feed = async (token: string) => {
    const res = await fetch(`${base}/calendar/${token}.ics?web=http://localhost:3002`);
    return { status: res.status, type: res.headers.get("content-type"), text: await res.text() };
  };

  const token = (await api("/me/calendar", { token: fan.token })).json.data.token;
  assert.equal((await api("/me/calendar", { token: fan.token })).json.data.token, token, "stable until reset");
  const f = await feed(token);
  assert.equal(f.status, 200);
  assert.match(f.type!, /^text\/calendar/);
  assert.equal(f.text.match(/BEGIN:VEVENT/g)!.length, 2);
  assert.match(f.text, /SUMMARY:Feed Night\\, Live/, "RFC 5545 escaping");
  assert.match(f.text, /2 × General/);
  assert.match(f.text, /SUMMARY:Cancelled: Called Off\r\nSTATUS:CANCELLED/);
  assert.match(f.text, new RegExp(`URL:http://localhost:3002/events/${ev._id}`));
  assert.ok(f.text.split("\r\n").every((line) => line.length <= 75), "lines folded");

  const fresh = (await post("/me/calendar/reset", fan.token)).json.data.token;
  assert.notEqual(fresh, token);
  assert.equal((await feed(token)).status, 404, "the old link stops working");
  assert.equal((await feed(fresh)).status, 200);
  assert.equal((await fetch(`${base}/calendar/not-a-token`)).status, 404);
});
