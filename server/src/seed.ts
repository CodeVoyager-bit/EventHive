import "dotenv/config";
import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User, { IUser } from "./models/User";
import Event, { IEvent } from "./models/Event";
import Booking from "./models/Booking";
import Ticket from "./models/Ticket";
import Review from "./models/Review";
import Waitlist from "./models/Waitlist";
import Notification from "./models/Notification";
import Announcement from "./models/Announcement";
import HostQuestion from "./models/HostQuestion";
import Report from "./models/Report";
import { quote } from "./domain/pricing";
import { newRef, newSecret } from "./domain/totp";

// Demo data for local development. Wipes the database first.
// Logins (password for all: password123):
//   admin@eventhive.dev                      admin console: verify hosts, review reported events
//   organizer@eventhive.dev                  Maya Organizer (verified host)
//   organizer2@eventhive.dev                 Dev Collective (unverified, try verifying as admin)
//   organizer3@eventhive.dev                 Tide Run Club
//   attendee@eventhive.dev                   Ananya: tickets, a received transfer, a waitlist spot, notifications
//   attendee2@eventhive.dev                  Rohan: a pending approval request, door duty at tonight's comedy show
//   plus eight more attendees, e.g. priya@eventhive.dev
// Dates are relative to when you run this, so re-run it if the demo events have all gone past.

const DAY = 86_400_000;
const HOUR = 3_600_000;
// d days from today at a realistic local start time (server time zone)
const inDays = (d: number, hour = 19, minute = 0) => {
  const t = new Date(Date.now() + d * DAY);
  t.setHours(hour, minute, 0, 0);
  return t;
};
// The coming Saturday (or Sunday) at a given hour, at least a day away
const nextWeekday = (weekday: number, hour: number) => {
  const t = new Date();
  t.setDate(t.getDate() + ((weekday - t.getDay() + 7) % 7 || 7));
  t.setHours(hour, 0, 0, 0);
  return t;
};
// Unsplash photos matched to each event (Unsplash License). IDs verified to resolve.
const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
const txn = () => `stripe_seed_${crypto.randomBytes(6).toString("hex")}`;

type TierSeed = { name: string; price: number; capacity: number; description?: string; salesEnd?: Date; maxPerOrder?: number };
const tiers = (...list: TierSeed[]) =>
  list.map((t) => ({ _id: new Types.ObjectId(), maxPerOrder: 6, ...t, remaining: t.capacity }));

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/eventhive");
  await Promise.all(
    [User, Event, Booking, Ticket, Review, Waitlist, Notification, Announcement, HostQuestion, Report].map((m) => (m as mongoose.Model<unknown>).deleteMany({}))
  );
  // Rebuild indexes from the schemas (drops ones left over from older versions of the app)
  for (const m of [User, Event, Booking, Ticket, Review, Waitlist, Notification, Announcement, HostQuestion, Report]) await (m as mongoose.Model<unknown>).syncIndexes();

  const password = await bcrypt.hash("password123", 12);
  const [admin, maya, devc, tide, ananya, rohan, ...crowd] = await User.create([
    { name: "EventHive Admin", email: "admin@eventhive.dev", password, role: "admin" },
    { name: "Maya Organizer", email: "organizer@eventhive.dev", password, role: "organizer", verified: true, city: "Mumbai",
      bio: "Rooftop gigs, supper clubs and the occasional jazz night. Seven years of putting on shows people talk about the next morning." },
    { name: "Dev Collective", email: "organizer2@eventhive.dev", password, role: "organizer", city: "Pune",
      bio: "A volunteer-run community for developers. Meetups, bootcamps and deep dives, mostly free, always with pizza." },
    { name: "Tide Run Club", email: "organizer3@eventhive.dev", password, role: "organizer", verified: true, city: "Goa",
      bio: "Coastal runs, sunrise yoga and races with proper medals. All paces welcome." },
    { name: "Ananya Attendee", email: "attendee@eventhive.dev", password, role: "attendee", city: "Mumbai" },
    { name: "Rohan Attendee", email: "attendee2@eventhive.dev", password, role: "attendee", city: "Bengaluru" },
    ...["Priya Nair", "Arjun Mehta", "Kavya Reddy", "Vikram Singh", "Meera Iyer", "Aditya Rao", "Sneha Kulkarni", "Rahul Verma"].map((name) => ({
      name,
      email: `${name.split(" ")[0].toLowerCase()}@eventhive.dev`,
      password,
      role: "attendee",
    })),
  ]);
  void admin;
  const people = [ananya, rohan, ...crowd];
  // First-timers: each has booked once, so hosts' audiences mix regulars with new faces
  const newcomers = await User.create(
    ["Neha Joshi", "Karan Malhotra", "Ishaan Gupta", "Pooja Shah", "Farhan Qureshi"].map((name) => ({
      name, email: `${name.split(" ")[0].toLowerCase()}@eventhive.dev`, password, role: "attendee",
    }))
  );

  const createdAt = new Date(Date.now() - 25 * DAY);
  const base = { status: "published", createdAt, publishedAt: createdAt };
  type Def = Record<string, unknown> & { title: string; tiers: ReturnType<typeof tiers>; promoCodes?: { code: string; kind: "percent" | "flat"; amount: number; limit: number }[] };
  const venue = (o: Def): Def => ({ ...base, eventType: "venue", ...o });
  const online = (o: Def): Def => ({ ...base, eventType: "online", location: "Online", ...o });

  const defs = [
    venue({ title: "Indie Night Live", category: "music", organizerId: maya._id, location: "Mumbai", address: "Rooftop, Bandra West", date: inDays(12, 20),
      description: "Four up-and-coming indie bands, one rooftop, and the city skyline. Doors open at sunset; headliner at 9pm.",
      imageUrl: img("1493225457124-a3eb161ffa5f"), refundPolicy: "flexible", team: [rohan._id], groupDiscount: { minQty: 4, percent: 10 },
      tiers: tiers(
        { name: "Early bird", price: 599, capacity: 60, salesEnd: inDays(2, 23, 59), description: "Same show, lower price. Ends soon." },
        { name: "General", price: 799, capacity: 120 },
        { name: "VIP", price: 1999, capacity: 20, maxPerOrder: 4, description: "Balcony access and a meet-and-greet with the bands." }
      ),
      promoCodes: [{ code: "INDIE20", kind: "percent", amount: 20, limit: 50 }] }),
    venue({ title: "React & Beyond Meetup", category: "tech", organizerId: devc._id, location: "Pune", address: "Hinjewadi Phase 1", date: inDays(5, 18, 30),
      description: "Lightning talks on React Server Components, streaming, and the state of the ecosystem. Pizza included.",
      imageUrl: img("1523580494863-6f3031224c94"), tiers: tiers({ name: "Free RSVP", price: 0, capacity: 80 }),
      questions: [{ _id: new Types.ObjectId(), label: "What do you build with React?", required: false }] }),
    venue({ title: "Monsoon Marathon", category: "sports", organizerId: tide._id, location: "Goa", address: "Miramar Beach", date: inDays(20, 6),
      description: "A 10k and 21k run along the coast. Chip timing, hydration stations every 2km, finisher medals.",
      imageUrl: img("1461896836934-ffe607ba8211"), refundPolicy: "moderate",
      tiers: tiers({ name: "10K", price: 499, capacity: 300 }, { name: "Half marathon", price: 899, capacity: 200 }),
      questions: [{ _id: new Types.ObjectId(), label: "T-shirt size (S, M, L, XL)", required: true }] }),
    venue({ title: "Watercolor Weekend", category: "art", organizerId: maya._id, location: "Bengaluru", address: "Indiranagar Art Studio", date: inDays(9, 10),
      description: "A two-day studio workshop for beginners. All materials provided; leave with three finished pieces.",
      imageUrl: img("1513364776144-60967b0f800f"), refundPolicy: "moderate", tiers: tiers({ name: "Studio seat", price: 2499, capacity: 12, maxPerOrder: 2 }) }),
    venue({ title: "Street Food Carnival", category: "food", organizerId: devc._id, location: "Delhi", address: "Jawaharlal Nehru Stadium grounds", date: inDays(15, 17),
      description: "Sixty stalls from across the country. Live cooking demos, a chilli-eating contest, and a kids' corner.",
      imageUrl: img("1555939594-58d7cb561ad1"), absorbFees: true, groupDiscount: { minQty: 5, percent: 15 },
      tiers: tiers({ name: "Entry", price: 199, capacity: 300 }, { name: "Tasting pass", price: 699, capacity: 100, description: "Entry plus ten tasting tokens." }),
      promoCodes: [{ code: "FOODIE", kind: "flat", amount: 100, limit: 30 }] }),
    venue({ title: "Founders Breakfast", category: "business", organizerId: maya._id, location: "Hyderabad", address: "T-Hub, Raidurg", date: inDays(3, 8, 30),
      description: "An intimate breakfast for early-stage founders. Two short talks on fundraising, then open networking. Requests are reviewed to keep the room balanced.",
      imageUrl: img("1515187029135-18ee286d815b"), requiresApproval: true, refundPolicy: "flexible",
      tiers: tiers({ name: "Seat", price: 1499, capacity: 10, maxPerOrder: 1 }),
      questions: [{ _id: new Types.ObjectId(), label: "What are you building?", required: true }] }),
    online({ title: "Cloud Native Bootcamp", category: "tech", organizerId: devc._id, date: inDays(7, 10), platform: "Zoom", meetingLink: "https://zoom.us/j/000000000",
      description: "A full-day hands-on bootcamp: containers, Kubernetes basics, and deploying your first service. Recording included.",
      imageUrl: img("1551288049-bebda4e38f71"), tiers: tiers({ name: "Standard", price: 2999, capacity: 1000 }),
      promoCodes: [{ code: "CLOUD50", kind: "percent", amount: 50, limit: 10 }] }),
    venue({ title: "Jazz Under the Stars", category: "music", organizerId: maya._id, location: "Jaipur", address: "Central Park Amphitheatre", date: inDays(30, 19, 30),
      description: "An open-air evening of classic and contemporary jazz with a 12-piece ensemble. Bring a blanket.",
      imageUrl: img("1415201364774-f6f0bb35f28f"), refundPolicy: "strict",
      tiers: tiers({ name: "Lawn", price: 1199, capacity: 120 }, { name: "Front rows", price: 1999, capacity: 30 }) }),
    venue({ title: "Secret Supper Club", category: "food", organizerId: maya._id, location: "Mumbai", address: "Flat 12B, Carter Road, Bandra West", date: inDays(8, 20, 30),
      description: "A seven-course tasting menu at an undisclosed location, revealed to confirmed guests. Two seats only.",
      imageUrl: img("1414235077428-338989a2e8c0"), requiresApproval: true, secretLocation: true, refundPolicy: "strict",
      tiers: tiers({ name: "Seat", price: 4999, capacity: 2, maxPerOrder: 2 }) }),
    venue({ title: "Late Night Comedy Hour", category: "other", organizerId: maya._id, location: "Bengaluru", address: "The Courtyard, Koramangala", date: inDays(0, 21).getTime() - Date.now() > 2 * HOUR ? inDays(0, 21) : new Date(Date.now() + 5 * HOUR),
      description: "Six comics, five minutes each, then the headliner. New material, so expect some bits to bomb gloriously.",
      imageUrl: img("1475721027785-f74eccf877e2"), team: [rohan._id], tiers: tiers({ name: "General", price: 299, capacity: 80 }) }),
    venue({ title: "Saturday Pottery Basics", category: "art", organizerId: devc._id, location: "Pune", address: "Clay Corner, Koregaon Park", date: nextWeekday(6, 11),
      description: "Centre clay, pull walls and make two pieces on the wheel. Glazed and ready to collect in two weeks.",
      imageUrl: img("1565193566173-7a0ee3dbe261"), refundPolicy: "moderate", tiers: tiers({ name: "Wheel spot", price: 1800, capacity: 10, maxPerOrder: 2 }) }),
    venue({ title: "Sunday Book Swap", category: "other", organizerId: devc._id, location: "Delhi", address: "Lodhi Garden, Gate 1", date: nextWeekday(0, 16),
      description: "Bring a book you loved, leave with one someone else did. Tea and biscuits on the lawn.",
      imageUrl: img("1512820790803-83ca734da794"), tiers: tiers({ name: "Free RSVP", price: 0, capacity: 50 }) }),
    venue({ title: "Pitch Night: Seed Stage", category: "business", organizerId: maya._id, location: "Bengaluru", address: "91springboard, HSR Layout", date: inDays(18, 18),
      description: "Eight founders, three minutes each, live feedback from investors. Drinks and introductions after.",
      imageUrl: img("1544531586-fde5298cdd40"), tiers: tiers({ name: "Audience", price: 499, capacity: 150 }) }),
    // Tickets not on sale yet (a countdown and "Notify me"), and one whose sales opened this morning
    venue({ title: "Classic Cinema Night", category: "other", organizerId: maya._id, location: "Mumbai", address: "Regal Studio, Colaba", date: inDays(16, 19, 30),
      description: "A restored 35mm print of a Bollywood classic on the big screen, with an intro from a film historian and chai at the interval.",
      imageUrl: img("1517604931442-7e0c8ed2963c"), salesStart: inDays(2, 12), groupDiscount: { minQty: 4, percent: 10 },
      tiers: tiers({ name: "Recliner", price: 449, capacity: 40, maxPerOrder: 4 }, { name: "Classic seat", price: 249, capacity: 120 }) }),
    venue({ title: "Coastal Cycling Tour", category: "sports", organizerId: tide._id, location: "Goa", address: "Starts at Miramar Circle", date: inDays(10, 6),
      description: "A 30km sunrise ride along the coast with a support van, a breakfast stop in a fishing village and a ride back by 10am. Road bikes available.",
      imageUrl: img("1541625602330-2277a4c46182"), salesStart: new Date(Date.now() - 5 * HOUR), refundPolicy: "moderate",
      tiers: tiers({ name: "Bring your bike", price: 699, capacity: 30 }, { name: "Bike included", price: 1199, capacity: 15, maxPerOrder: 2 }) }),
    // Past events, so reviews and check-ins can be demonstrated
    online({ title: "TypeScript Deep Dive", category: "tech", organizerId: devc._id, date: inDays(-10, 18), platform: "Google Meet", meetingLink: "https://meet.google.com/abc-defg-hij",
      description: "Generics, conditional types, and the type-level tricks behind popular libraries. Three hours, lots of code.",
      imageUrl: img("1540575467063-178a50c2df87"), tiers: tiers({ name: "Standard", price: 999, capacity: 300 }) }),
    venue({ title: "Vinyl Listening Night", category: "music", organizerId: maya._id, location: "Mumbai", address: "The Record Room, Lower Parel", date: inDays(-21, 21),
      description: "One full album on a vintage hi-fi, front to back, lights low and phones away. Then a crate-digging swap.",
      imageUrl: img("1458560871784-56d23406c091"), refundPolicy: "strict", tiers: tiers({ name: "Listening seat", price: 349, capacity: 40 }) }),
    venue({ title: "Poetry & Chai", category: "art", organizerId: maya._id, location: "Mumbai", address: "Kitab Khana, Fort", date: inDays(-2, 18),
      description: "An open mic for new and old poems in any language, with endless cutting chai. Sign up at the door to read.",
      imageUrl: img("1455390582262-044cdead277a"), absorbFees: true, tiers: tiers({ name: "Listener", price: 249, capacity: 60 }) }),
    venue({ title: "Sunset Yoga Flow", category: "sports", organizerId: tide._id, location: "Goa", address: "Palolem Beach", date: inDays(-4, 17, 30),
      description: "A gentle 75-minute vinyasa flow on the beach, timed to end as the sun goes down. Mats provided.",
      imageUrl: img("1506126613408-eca07ce68773"), tiers: tiers({ name: "Mat", price: 399, capacity: 60 }) }),
  ];
  // Totals across tiers (kept in sync by the app; computed here once)
  for (const d of defs) {
    const t = d.tiers;
    Object.assign(d, {
      capacity: t.reduce((n, x) => n + x.capacity, 0),
      price: Math.min(...t.map((x) => x.price)),
      promoCodes: d.promoCodes?.map((p) => ({ ...p, remaining: p.limit })),
    });
  }
  const events = (await Event.create(defs)) as IEvent[];
  const ev = Object.fromEntries(events.map((e) => [e.title, e]));
  const promoLeft = new Map<string, number>();

  // Deterministic pseudo-random so every seed produces the same demo
  let n = 7;
  const rand = () => (n = (n * 9301 + 49297) % 233280) / 233280;

  type BookOpts = { tier?: string; qty?: number; daysAgo?: number; promo?: string; protection?: boolean; ref?: IUser; status?: "pending" | "confirmed"; answers?: string[] };
  const bookings: Record<string, unknown>[] = [];
  const tickets: Record<string, unknown>[] = [];
  const book = (user: IUser, title: string, o: BookOpts = {}) => {
    const event = ev[title];
    const tier = o.tier ? event.tiers.find((t) => t.name === o.tier)! : event.tiers[0];
    const qty = o.qty ?? 1;
    const promoDef = o.promo ? defs.find((d) => d.title === title)!.promoCodes?.find((p) => p.code === o.promo) : null;
    const pricing = quote({ unitPrice: tier.price, quantity: qty, promo: promoDef, protection: !!o.protection, absorbFees: event.absorbFees });
    const status = o.status ?? "confirmed";
    const bookingDate = new Date(Math.min(Date.now() - HOUR, event.date.getTime() - DAY, Date.now() - (o.daysAgo ?? Math.floor(rand() * 21)) * DAY - Math.floor(rand() * 8) * HOUR));
    const _id = new Types.ObjectId();
    tier.remaining -= qty;
    if (o.promo) promoLeft.set(`${title}:${o.promo}`, (promoLeft.get(`${title}:${o.promo}`) ?? 0) + 1);
    bookings.push({
      _id, userId: user._id, eventId: event._id, status, tierId: tier._id, tierName: tier.name, quantity: qty, unitPrice: tier.price,
      promoCode: o.promo, protection: !!o.protection, refundPolicy: event.refundPolicy, pricing, amount: pricing.subtotal - pricing.discount,
      answers: (o.answers ?? []).map((answer, i) => ({ question: event.questions[i]?.label, answer })),
      referrerId: o.ref?._id, bookingDate, transactionId: status === "confirmed" && pricing.total > 0 ? txn() : undefined,
    });
    if (status === "confirmed") {
      const past = event.date.getTime() < Date.now();
      for (let i = 0; i < qty; i++) {
        tickets.push({
          bookingId: _id, eventId: event._id, ownerId: user._id, holderName: i === 0 ? user.name : `${user.name}'s guest`, tierName: tier.name,
          ref: newRef(), secret: newSecret(), createdAt: bookingDate,
          ...(past ? { checkedInAt: new Date(event.date.getTime() + (10 + Math.floor(rand() * 40)) * 60_000) } : {}),
        });
      }
    }
    return _id;
  };

  // Ananya brings friends to Indie Night through her link (shows up in the referral leaderboard)
  book(ananya, "Indie Night Live", { tier: "Early bird", qty: 2, daysAgo: 18, protection: true });
  book(crowd[0], "Indie Night Live", { tier: "Early bird", qty: 2, ref: ananya, daysAgo: 16 });
  book(crowd[1], "Indie Night Live", { tier: "General", qty: 3, ref: ananya, promo: "INDIE20", daysAgo: 12 });
  book(crowd[2], "Indie Night Live", { tier: "VIP", qty: 2, ref: ananya, daysAgo: 9 });
  book(crowd[3], "Indie Night Live", { tier: "General", qty: 1, promo: "INDIE20", daysAgo: 6 });
  book(crowd[4], "Indie Night Live", { tier: "General", qty: 4, ref: crowd[1], daysAgo: 3 });
  book(crowd[5], "Indie Night Live", { tier: "Early bird", qty: 1, daysAgo: 1 });
  book(rohan, "Indie Night Live", { tier: "VIP", qty: 1, daysAgo: 2 });
  people.slice(0, 9).forEach((u, i) => book(u, "React & Beyond Meetup", { qty: i % 3 === 0 ? 2 : 1, answers: [i % 2 ? "Dashboards at work" : "Side projects"] }));
  [crowd[0], crowd[2], crowd[4], crowd[6]].forEach((u, i) => book(u, "Monsoon Marathon", { tier: i % 2 ? "Half marathon" : "10K", answers: ["M"] }));
  book(ananya, "Monsoon Marathon", { tier: "10K", answers: ["S"], daysAgo: 4 });
  [crowd[1], crowd[3], crowd[5], crowd[7], rohan].forEach((u, i) => book(u, "Watercolor Weekend", { qty: i < 4 ? 2 : 1 }));
  people.slice(2, 8).forEach((u, i) => book(u, "Street Food Carnival", { tier: i % 2 ? "Tasting pass" : "Entry", qty: 2, promo: i === 1 ? "FOODIE" : undefined }));
  [crowd[0], crowd[1], crowd[2], crowd[3], crowd[4]].forEach((u) => book(u, "Founders Breakfast", { answers: ["A logistics app for small farmers"] }));
  book(rohan, "Founders Breakfast", { status: "pending", answers: ["Payroll software for clinics"], daysAgo: 1 });
  book(crowd[6], "Founders Breakfast", { status: "pending", answers: ["Still exploring ideas"], daysAgo: 0 });
  people.slice(3, 8).forEach((u) => book(u, "Cloud Native Bootcamp", { promo: u === crowd[3] ? "CLOUD50" : undefined }));
  book(ananya, "Cloud Native Bootcamp", { daysAgo: 5 });
  book(rohan, "Jazz Under the Stars", { tier: "Front rows", qty: 2, daysAgo: 7 }); // one of these goes to Ananya below
  [crowd[6], crowd[7]].forEach((u) => book(u, "Jazz Under the Stars", { tier: "Lawn", qty: 2 }));
  book(crowd[0], "Secret Supper Club", { qty: 2, daysAgo: 14 }); // sold out
  people.slice(0, 7).forEach((u, i) => book(u, "Late Night Comedy Hour", { qty: i % 2 ? 2 : 1, daysAgo: i }));
  [crowd[2], crowd[4], crowd[6]].forEach((u) => book(u, "Saturday Pottery Basics", { qty: 2 }));
  people.slice(4, 10).forEach((u) => book(u, "Sunday Book Swap"));
  people.slice(1, 6).forEach((u) => book(u, "Pitch Night: Seed Stage"));
  people.slice(0, 6).forEach((u) => book(u, "TypeScript Deep Dive", { daysAgo: 20 }));
  [ananya, ...crowd.slice(2, 6)].forEach((u) => book(u, "Sunset Yoga Flow", { daysAgo: 12 }));
  book(newcomers[0], "Pitch Night: Seed Stage", { daysAgo: 2 });
  book(newcomers[1], "Pitch Night: Seed Stage", { daysAgo: 1 });
  book(newcomers[2], "Jazz Under the Stars", { tier: "Lawn", qty: 2, daysAgo: 3 });
  book(newcomers[3], "Late Night Comedy Hour", { daysAgo: 1 });
  book(newcomers[4], "Indie Night Live", { tier: "General", qty: 2, daysAgo: 4 });
  [ananya, rohan, ...crowd.slice(0, 6)].forEach((u, i) => book(u, "Vinyl Listening Night", { qty: i % 3 ? 1 : 2, daysAgo: 30 + i }));
  [ananya, ...crowd.slice(1, 8)].forEach((u, i) => book(u, "Poetry & Chai", { qty: i % 2 ? 2 : 1, daysAgo: 8 + i }));

  await Booking.insertMany(bookings);
  const savedTickets = await Ticket.insertMany(tickets);

  // Rohan sent one of his Jazz tickets to Ananya (it re-keys, like a real transfer)
  const jazz = savedTickets.find((t) => String(t.eventId) === String(ev["Jazz Under the Stars"]._id) && String(t.ownerId) === String(rohan._id) && t.holderName !== rohan.name)!;
  await Ticket.updateOne({ _id: jazz._id }, { $set: { ownerId: ananya._id, holderName: ananya.name, ref: newRef(), secret: newSecret(), transferredAt: new Date(Date.now() - DAY) } });

  // Seat and promo counts follow from the bookings above
  for (const e of events) {
    const promos = defs.find((d) => d.title === e.title)!.promoCodes ?? [];
    await Event.updateOne(
      { _id: e._id },
      {
        $set: {
          tiers: e.tiers,
          bookedCount: e.tiers.reduce((sum, t) => sum + t.capacity - t.remaining, 0),
          // Page views, so hosts' conversion rates look like real ones (roughly 1 booking per 6 to 14 views)
          views: Math.round(bookings.filter((b) => String(b.eventId) === String(e._id)).length * (6 + rand() * 8)) + 15,
          promoCodes: promos.map((p) => ({ ...p, remaining: p.limit - (promoLeft.get(`${e.title}:${p.code}`) ?? 0) })),
        },
      }
    );
  }

  // Sold-out Secret Supper Club has a line; Ananya is first in it
  await Waitlist.create([
    { eventId: ev["Secret Supper Club"]._id, userId: ananya._id, tierId: ev["Secret Supper Club"].tiers[0]._id, quantity: 2, createdAt: new Date(Date.now() - 6 * DAY) },
    { eventId: ev["Secret Supper Club"]._id, userId: crowd[4]._id, tierId: ev["Secret Supper Club"].tiers[0]._id, quantity: 1, createdAt: new Date(Date.now() - 4 * DAY) },
    { eventId: ev["Secret Supper Club"]._id, userId: crowd[5]._id, tierId: ev["Secret Supper Club"].tiers[0]._id, quantity: 2, createdAt: new Date(Date.now() - 2 * DAY) },
  ]);

  // Follows: Ananya follows Maya and Tide; the crowd follows a mix
  // Saving an event before its sales open is "Notify me": the cycling tour's alert arrives on her first visit
  await User.updateOne(
    { _id: ananya._id },
    { $set: { following: [maya._id, tide._id], saved: [ev["Jazz Under the Stars"]._id, ev["Pitch Night: Seed Stage"]._id, ev["Classic Cinema Night"]._id, ev["Coastal Cycling Tour"]._id] } }
  );
  await User.updateOne({ _id: rohan._id }, { $set: { following: [devc._id], saved: [ev["Cloud Native Bootcamp"]._id] } });
  for (const [i, u] of crowd.entries()) {
    await User.updateOne({ _id: u._id }, { $set: { following: i % 2 ? [maya._id] : [maya._id, devc._id, tide._id], saved: [ev["Indie Night Live"]._id, ...(i % 3 ? [] : [ev["Secret Supper Club"]._id])] } });
  }

  await Announcement.create([
    { eventId: ev["Indie Night Live"]._id, authorId: maya._id, body: "Doors move to 6:30pm so you catch the opener at sunset. The lift is on the left of the lobby.", createdAt: new Date(Date.now() - 2 * DAY) },
    { eventId: ev["Monsoon Marathon"]._id, authorId: tide._id, body: "Bib collection is the evening before, 4 to 8pm at the beach shack. Bring a photo ID.", createdAt: new Date(Date.now() - DAY) },
  ]);

  const reviews = [
    [ananya, "TypeScript Deep Dive", 5, "Dense but brilliant. The section on conditional types finally made them click."],
    [rohan, "TypeScript Deep Dive", 4, "Great content, slightly rushed at the end."],
    [crowd[0], "TypeScript Deep Dive", 5, "Best three hours I've spent on types. Bring coffee."],
    [crowd[1], "TypeScript Deep Dive", 4, "Loved the live coding. Slides would have helped."],
    [ananya, "Sunset Yoga Flow", 5, "Perfect timing with the sunset. Will come back."],
    [crowd[2], "Sunset Yoga Flow", 5, "Calm, well paced, and the beach was gorgeous."],
    [crowd[3], "Sunset Yoga Flow", 4, "Lovely session. Arrive early for a good spot."],
  ] as const;
  await Review.create(
    reviews.map(([u, title, rating, comment], i) => ({
      userId: u._id, eventId: ev[title]._id, rating, comment, createdAt: new Date(Date.now() - (i + 1) * DAY),
      ...(i === 1 ? { reply: { body: "Fair point. We're splitting it into two sessions next time so nothing gets rushed.", createdAt: new Date(Date.now() - i * DAY) } } : {}),
    }))
  );

  const now = Date.now();
  await Notification.create([
    { userId: ananya._id, kind: "ticket_received", title: "Rohan Attendee sent you a ticket", body: "Front rows for Jazz Under the Stars. It's in My Tickets.", link: "/bookings", createdAt: new Date(now - DAY) },
    { userId: ananya._id, kind: "announcement", title: "Update for Indie Night Live", body: "Doors move to 6:30pm so you catch the opener at sunset.", link: `/events/${ev["Indie Night Live"]._id}#updates`, createdAt: new Date(now - 2 * DAY) },
    { userId: ananya._id, kind: "new_event", title: "Maya Organizer just announced Pitch Night: Seed Stage", body: "Eight founders, three minutes each.", link: `/events/${ev["Pitch Night: Seed Stage"]._id}`, createdAt: new Date(now - 3 * DAY), readAt: new Date(now - 2 * DAY) },
    { userId: rohan._id, kind: "booking_request", title: "Your request for Founders Breakfast is with the host", body: "You'll hear back here. You won't be charged unless you're approved.", link: "/bookings", createdAt: new Date(now - DAY) },
    { userId: maya._id, kind: "booking_request", title: "Rohan Attendee asked to join Founders Breakfast", body: "1 ticket, Seat. Approve or decline from your guest list.", link: `/dashboard/${ev["Founders Breakfast"]._id}/attendees`, createdAt: new Date(now - DAY) },
    { userId: maya._id, kind: "question", title: "Rohan Attendee asked about Indie Night Live", body: "Is the rooftop covered if it rains?", link: `/events/${ev["Indie Night Live"]._id}#questions`, createdAt: new Date(now - 6 * HOUR) },
    { userId: rohan._id, kind: "door_team", title: "You're on the door for Late Night Comedy Hour", body: "Maya Organizer added you to the door team. Open Door duty in My Tickets to scan guests in.", link: `/door/${ev["Late Night Comedy Hour"]._id}`, createdAt: new Date(now - 2 * HOUR) },
    { userId: maya._id, kind: "booking_request", title: "Sneha Kulkarni asked to join Founders Breakfast", body: "1 ticket, Seat. Approve or decline from your guest list.", link: `/dashboard/${ev["Founders Breakfast"]._id}/attendees`, createdAt: new Date(now - 3 * HOUR) },
  ]);

  // Ask the host: answered questions help every later guest; Rohan's is still waiting for Maya
  const qa = (title: string, u: IUser, body: string, hoursAgo: number, answer?: string) => ({
    eventId: ev[title]._id, userId: u._id, body, createdAt: new Date(now - hoursAgo * HOUR),
    ...(answer ? { answer: { body: answer, createdAt: new Date(now - (hoursAgo - 3) * HOUR) } } : {}),
  });
  await HostQuestion.create([
    qa("Indie Night Live", crowd[3], "Is there parking near the venue, or is a cab better?", 96, "Street parking fills up fast. Take a cab, or the train to Bandra: the venue is a 10 minute walk from the station."),
    qa("Indie Night Live", crowd[1], "Can I bring a small camera? No big lenses.", 53, "Yes, phones and small cameras are fine. No tripods, and no flash during sets please."),
    qa("Indie Night Live", rohan, "Is the rooftop covered if it rains?", 6),
    qa("Monsoon Marathon", crowd[4], "Will there be a bag drop at the start line?", 48, "Yes, a free bag drop opens at 5am next to the registration tent."),
    qa("Founders Breakfast", crowd[5], "Is this open to founders who haven't raised yet?", 72, "Absolutely. Most of the room is pre-seed. Tell us what you're building in your request."),
  ]);

  // Reports waiting in the admin queue (two people flagged the book swap's meeting point)
  await Report.create([
    { kind: "event", targetId: ev["Sunday Book Swap"]._id, eventId: ev["Sunday Book Swap"]._id, reporterId: rohan._id, reason: "wrong_info", note: "Gate 1 is shut on Sundays, so people will wait at the wrong gate.", createdAt: new Date(now - 20 * HOUR) },
    { kind: "event", targetId: ev["Sunday Book Swap"]._id, eventId: ev["Sunday Book Swap"]._id, reporterId: crowd[2]._id, reason: "wrong_info", createdAt: new Date(now - 5 * HOUR) },
    { kind: "event", targetId: ev["Cloud Native Bootcamp"]._id, eventId: ev["Cloud Native Bootcamp"]._id, reporterId: crowd[6]._id, reason: "spam", note: "The same bootcamp gets posted every month.", createdAt: new Date(now - 2 * HOUR) },
  ]);

  console.log(`Seeded ${events.length} events, ${bookings.length} bookings, ${tickets.length} tickets, ${reviews.length} reviews, ${people.length + newcomers.length + 4} users (see comments in src/seed.ts for logins).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
