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
// Password for all: password123

const DAY = 86_400_000;
const inDays = (d: number) => new Date(Date.now() + d * DAY);
const img = (seed: string) => `https://picsum.photos/seed/${seed}/1200/630`;
const code = () => crypto.randomBytes(8).toString("hex").toUpperCase();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/eventhive");
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Booking.deleteMany({}), Review.deleteMany({})]);

  const password = await bcrypt.hash("password123", 12);
  const [org1, org2, att1, att2] = await User.create([
    { name: "Maya Organizer", email: "organizer@eventhive.dev", password, role: "organizer" },
    { name: "Dev Collective", email: "organizer2@eventhive.dev", password, role: "organizer" },
    { name: "Ananya Attendee", email: "attendee@eventhive.dev", password, role: "attendee" },
    { name: "Rohan Attendee", email: "attendee2@eventhive.dev", password, role: "attendee" },
  ]);

  const venue = (o: Record<string, unknown>) => ({ eventType: "venue", status: "published", ...o });
  const online = (o: Record<string, unknown>) => ({ eventType: "online", status: "published", location: "Online", ...o });

  const events = await Event.create([
    venue({ title: "Indie Night Live", description: "Four up-and-coming indie bands, one rooftop, and the city skyline. Doors open at sunset; headliner at 9pm.", date: inDays(12), location: "Mumbai", address: "Rooftop, Bandra West", capacity: 200, price: 25, category: "music", imageUrl: img("indie-night"), organizerId: org1._id }),
    venue({ title: "React & Beyond Meetup", description: "Lightning talks on React Server Components, streaming, and the state of the ecosystem. Pizza included.", date: inDays(5), location: "Pune", address: "Hinjewadi Phase 1", capacity: 80, price: 0, category: "tech", imageUrl: img("react-meetup"), organizerId: org2._id }),
    venue({ title: "Monsoon Marathon", description: "A 10k and 21k run along the coast. Chip timing, hydration stations every 2km, finisher medals.", date: inDays(20), location: "Goa", address: "Miramar Beach", capacity: 500, price: 15, category: "sports", imageUrl: img("marathon"), organizerId: org1._id }),
    venue({ title: "Watercolor Weekend", description: "A two-day studio workshop for beginners. All materials provided; leave with three finished pieces.", date: inDays(9), location: "Bengaluru", address: "Indiranagar Art Studio", capacity: 25, price: 40, category: "art", imageUrl: img("watercolor"), organizerId: org1._id }),
    venue({ title: "Street Food Carnival", description: "Sixty stalls from across the country. Live cooking demos, a chilli-eating contest, and a kids' corner.", date: inDays(15), location: "Delhi", address: "Jawaharlal Nehru Stadium grounds", capacity: 300, price: 10, category: "food", imageUrl: img("street-food"), organizerId: org2._id }),
    venue({ title: "Founders Breakfast", description: "An intimate breakfast for early-stage founders. Two short talks on fundraising, then open networking.", date: inDays(3), location: "Hyderabad", address: "T-Hub, Raidurg", capacity: 40, price: 30, category: "business", imageUrl: img("founders"), organizerId: org1._id }),
    online({ title: "Cloud Native Bootcamp", description: "A full-day hands-on bootcamp: containers, Kubernetes basics, and deploying your first service. Recording included.", date: inDays(7), platform: "Zoom", meetingLink: "https://zoom.us/j/000000000", capacity: 1000, price: 49, category: "tech", imageUrl: img("cloud-native"), organizerId: org2._id }),
    venue({ title: "Jazz Under the Stars", description: "An open-air evening of classic and contemporary jazz with a 12-piece ensemble. Bring a blanket.", date: inDays(30), location: "Jaipur", address: "Central Park Amphitheatre", capacity: 150, price: 35, category: "music", imageUrl: img("jazz"), organizerId: org1._id }),
    venue({ title: "Secret Supper Club", description: "A seven-course tasting menu at an undisclosed location, revealed 24 hours before. Two seats only.", date: inDays(8), location: "Mumbai", address: "Revealed to ticket holders", capacity: 2, price: 80, category: "food", imageUrl: img("supper-club"), organizerId: org1._id }),
    // Past events, so reviews can be demonstrated
    online({ title: "TypeScript Deep Dive", description: "Generics, conditional types, and the type-level tricks behind popular libraries. Three hours, lots of code.", date: inDays(-10), platform: "Google Meet", meetingLink: "https://meet.google.com/abc-defg-hij", capacity: 300, price: 20, category: "tech", imageUrl: img("typescript"), organizerId: org2._id }),
    venue({ title: "Sunset Yoga Flow", description: "A gentle 75-minute vinyasa flow on the beach, timed to end as the sun goes down. Mats provided.", date: inDays(-4), location: "Goa", address: "Palolem Beach", capacity: 60, price: 12, category: "sports", imageUrl: img("yoga"), organizerId: org1._id }),
  ]);
  const byTitle = Object.fromEntries(events.map((e) => [e.title, e]));

  const book = (user: { _id: Types.ObjectId }, title: string, ticketType: "general" | "vip" = "general") => {
    const event = byTitle[title];
    return { userId: user._id, eventId: event._id, ticketType, ticketCode: code(), amount: ticketType === "vip" ? event.price * 2 : event.price, status: "confirmed", transactionId: `stripe_seed_${code()}` };
  };
  const bookings = [
    book(att1, "TypeScript Deep Dive"), book(att2, "TypeScript Deep Dive", "vip"),
    book(att1, "Sunset Yoga Flow"), book(att2, "Sunset Yoga Flow"),
    book(att1, "Secret Supper Club", "vip"), book(att2, "Secret Supper Club"),
    book(att1, "Indie Night Live"), book(att2, "React & Beyond Meetup"),
  ];
  await Booking.create(bookings);
  for (const b of bookings) await Event.updateOne({ _id: b.eventId }, { $inc: { bookedCount: 1 } });

  await Review.create([
    { userId: att1._id, eventId: byTitle["TypeScript Deep Dive"]._id, rating: 5, comment: "Dense but brilliant. The section on conditional types finally made them click." },
    { userId: att2._id, eventId: byTitle["TypeScript Deep Dive"]._id, rating: 4, comment: "Great content, slightly rushed at the end." },
    { userId: att1._id, eventId: byTitle["Sunset Yoga Flow"]._id, rating: 5, comment: "Perfect timing with the sunset. Will come back." },
  ]);

  console.log(`Seeded ${events.length} events, ${bookings.length} bookings, 3 reviews, 4 users (see comments in src/seed.ts for logins).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
