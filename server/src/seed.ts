import "dotenv/config";
import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "./models/User";
import Event from "./models/Event";
import Booking from "./models/Booking";
import Review from "./models/Review";

// Demo data for local development. Wipes the database first.
// Logins: organizer@eventhive.dev, organizer2@eventhive.dev, attendee@eventhive.dev, attendee2@eventhive.dev
// (plus eight more attendees, e.g. priya@eventhive.dev)
// Password for all: password123

const DAY = 86_400_000;
// d days from today at a realistic local start time (server time zone)
const inDays = (d: number, hour = 19, minute = 0) => {
  const t = new Date(Date.now() + d * DAY);
  t.setHours(hour, minute, 0, 0);
  return t;
};
// Unsplash photos matched to each event (Unsplash License). IDs verified to resolve.
const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
const code = () => crypto.randomBytes(8).toString("hex").toUpperCase();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/eventhive");
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Booking.deleteMany({}), Review.deleteMany({})]);

  const password = await bcrypt.hash("password123", 12);
  const [org1, org2, att1, att2, ...crowd] = await User.create([
    { name: "Maya Organizer", email: "organizer@eventhive.dev", password, role: "organizer" },
    { name: "Dev Collective", email: "organizer2@eventhive.dev", password, role: "organizer" },
    { name: "Ananya Attendee", email: "attendee@eventhive.dev", password, role: "attendee" },
    { name: "Rohan Attendee", email: "attendee2@eventhive.dev", password, role: "attendee" },
    // extra attendees so sales charts and "selling fast" badges have real numbers behind them
    ...["Priya Nair", "Arjun Mehta", "Kavya Reddy", "Vikram Singh", "Meera Iyer", "Aditya Rao", "Sneha Kulkarni", "Rahul Verma"].map((name) => ({
      name,
      email: `${name.split(" ")[0].toLowerCase()}@eventhive.dev`,
      password,
      role: "attendee",
    })),
  ]);
  const everyone = [att1, att2, ...crowd];

  const venue = (o: Record<string, unknown>) => ({ eventType: "venue", status: "published", ...o });
  const online = (o: Record<string, unknown>) => ({ eventType: "online", status: "published", location: "Online", ...o });

  const events = await Event.create([
    venue({ title: "Indie Night Live", description: "Four up-and-coming indie bands, one rooftop, and the city skyline. Doors open at sunset; headliner at 9pm.", date: inDays(12, 20), location: "Mumbai", address: "Rooftop, Bandra West", capacity: 200, price: 799, category: "music", imageUrl: img("1493225457124-a3eb161ffa5f"), organizerId: org1._id }),
    venue({ title: "React & Beyond Meetup", description: "Lightning talks on React Server Components, streaming, and the state of the ecosystem. Pizza included.", date: inDays(5, 18, 30), location: "Pune", address: "Hinjewadi Phase 1", capacity: 80, price: 0, category: "tech", imageUrl: img("1523580494863-6f3031224c94"), organizerId: org2._id }),
    venue({ title: "Monsoon Marathon", description: "A 10k and 21k run along the coast. Chip timing, hydration stations every 2km, finisher medals.", date: inDays(20, 6), location: "Goa", address: "Miramar Beach", capacity: 500, price: 499, category: "sports", imageUrl: img("1461896836934-ffe607ba8211"), organizerId: org1._id }),
    venue({ title: "Watercolor Weekend", description: "A two-day studio workshop for beginners. All materials provided; leave with three finished pieces.", date: inDays(9, 10), location: "Bengaluru", address: "Indiranagar Art Studio", capacity: 12, price: 2499, category: "art", imageUrl: img("1513364776144-60967b0f800f"), organizerId: org1._id }),
    venue({ title: "Street Food Carnival", description: "Sixty stalls from across the country. Live cooking demos, a chilli-eating contest, and a kids' corner.", date: inDays(15, 17), location: "Delhi", address: "Jawaharlal Nehru Stadium grounds", capacity: 300, price: 199, category: "food", imageUrl: img("1555939594-58d7cb561ad1"), organizerId: org2._id }),
    venue({ title: "Founders Breakfast", description: "An intimate breakfast for early-stage founders. Two short talks on fundraising, then open networking.", date: inDays(3, 8, 30), location: "Hyderabad", address: "T-Hub, Raidurg", capacity: 10, price: 1499, category: "business", imageUrl: img("1515187029135-18ee286d815b"), organizerId: org1._id }),
    online({ title: "Cloud Native Bootcamp", description: "A full-day hands-on bootcamp: containers, Kubernetes basics, and deploying your first service. Recording included.", date: inDays(7, 10), platform: "Zoom", meetingLink: "https://zoom.us/j/000000000", capacity: 1000, price: 2999, category: "tech", imageUrl: img("1551288049-bebda4e38f71"), organizerId: org2._id }),
    venue({ title: "Jazz Under the Stars", description: "An open-air evening of classic and contemporary jazz with a 12-piece ensemble. Bring a blanket.", date: inDays(30, 19, 30), location: "Jaipur", address: "Central Park Amphitheatre", capacity: 150, price: 1199, category: "music", imageUrl: img("1415201364774-f6f0bb35f28f"), organizerId: org1._id }),
    venue({ title: "Secret Supper Club", description: "A seven-course tasting menu at an undisclosed location, revealed 24 hours before. Two seats only.", date: inDays(8, 20, 30), location: "Mumbai", address: "Revealed to ticket holders", capacity: 2, price: 4999, category: "food", imageUrl: img("1414235077428-338989a2e8c0"), organizerId: org1._id }),
    // Past events, so reviews can be demonstrated
    online({ title: "TypeScript Deep Dive", description: "Generics, conditional types, and the type-level tricks behind popular libraries. Three hours, lots of code.", date: inDays(-10, 18), platform: "Google Meet", meetingLink: "https://meet.google.com/abc-defg-hij", capacity: 300, price: 999, category: "tech", imageUrl: img("1540575467063-178a50c2df87"), organizerId: org2._id }),
    venue({ title: "Sunset Yoga Flow", description: "A gentle 75-minute vinyasa flow on the beach, timed to end as the sun goes down. Mats provided.", date: inDays(-4, 17, 30), location: "Goa", address: "Palolem Beach", capacity: 60, price: 399, category: "sports", imageUrl: img("1506126613408-eca07ce68773"), organizerId: org1._id }),
  ]);
  const byTitle = Object.fromEntries(events.map((e) => [e.title, e]));

  // Deterministic pseudo-random so every seed produces the same demo
  let n = 7;
  const rand = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  const daysAgo = (d: number) => new Date(Date.now() - d * DAY - Math.floor(rand() * 8) * 3_600_000);

  const book = (user: { _id: Types.ObjectId }, title: string, ticketType: "general" | "vip", bookedDaysAgo: number) => {
    const event = byTitle[title];
    const past = event.date.getTime() < Date.now();
    return {
      userId: user._id,
      eventId: event._id,
      ticketType,
      ticketCode: code(),
      amount: ticketType === "vip" ? event.price * 2 : event.price,
      status: "confirmed",
      transactionId: `stripe_seed_${code()}`,
      bookingDate: daysAgo(bookedDaysAgo),
      ...(past ? { checkedInAt: new Date(event.date.getTime() + 15 * 60_000) } : {}),
    };
  };
  // How many people booked each event (first ones always include the two demo attendees)
  const plan: [string, number][] = [
    ["Indie Night Live", 7],
    ["React & Beyond Meetup", 9],
    ["Monsoon Marathon", 4],
    ["Watercolor Weekend", 9], // 9 of 12: almost full
    ["Street Food Carnival", 6],
    ["Founders Breakfast", 8], // 8 of 10: almost full
    ["Cloud Native Bootcamp", 5],
    ["Jazz Under the Stars", 3],
    ["Secret Supper Club", 2], // sold out
    ["TypeScript Deep Dive", 6],
    ["Sunset Yoga Flow", 5],
  ];
  const bookings = plan.flatMap(([title, count]) =>
    everyone.slice(0, count).map((u) => book(u, title, rand() < 0.25 ? "vip" : "general", Math.floor(rand() * 21)))
  );
  await Booking.create(bookings);
  for (const [title, count] of plan) await Event.updateOne({ _id: byTitle[title]._id }, { $set: { bookedCount: count } });

  const reviews = [
    [att1, "TypeScript Deep Dive", 5, "Dense but brilliant. The section on conditional types finally made them click."],
    [att2, "TypeScript Deep Dive", 4, "Great content, slightly rushed at the end."],
    [crowd[0], "TypeScript Deep Dive", 5, "Best three hours I've spent on types. Bring coffee."],
    [crowd[1], "TypeScript Deep Dive", 4, "Loved the live coding. Slides would have helped."],
    [att1, "Sunset Yoga Flow", 5, "Perfect timing with the sunset. Will come back."],
    [crowd[2], "Sunset Yoga Flow", 5, "Calm, well paced, and the beach was gorgeous."],
    [crowd[3], "Sunset Yoga Flow", 4, "Lovely session. Arrive early for a good spot."],
  ] as const;
  await Review.create(reviews.map(([u, title, rating, comment], i) => ({ userId: u._id, eventId: byTitle[title]._id, rating, comment, createdAt: daysAgo(i) })));

  console.log(`Seeded ${events.length} events, ${bookings.length} bookings, ${reviews.length} reviews, ${everyone.length + 2} users (see comments in src/seed.ts for logins).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
