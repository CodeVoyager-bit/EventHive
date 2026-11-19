import UserRepository from "../repositories/UserRepository";
import EventRepository from "../repositories/EventRepository";
import ReviewRepository from "../repositories/ReviewRepository";
import BookingRepository from "../repositories/BookingRepository";
import TicketRepository from "../repositories/TicketRepository";
import EventService from "./EventService";
import WaitlistService from "./WaitlistService";
import { Types } from "mongoose";
import { IUser } from "../models/User";
import { IEvent } from "../models/Event";
import { calendarFeed, FeedEvent } from "../domain/ics";
import { idOf } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";

const TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
const hourIn = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(d));

export type PickReason = { kind: "host"; name: string } | { kind: "category"; category: string } | { kind: "city"; city: string };
type TicketEvent = { _id: Types.ObjectId; title: string; date: Date; location: string; eventType: string; category: string; status: string; organizerId: Types.ObjectId };

class UserService {
  // "Picked for you": upcoming events scored by the hosts you follow, the kinds of event you book
  // and save, and your city. Each pick carries its strongest reason so the page can say why.
  // ponytail: a weighted score over the next 200 events; collaborative filtering if the catalogue grows.
  async forYou(userId: string) {
    const [user, following, tickets, saved] = await Promise.all([
      UserRepository.findById(userId),
      UserRepository.getFollowingIds(userId),
      TicketRepository.findOwned(userId),
      UserRepository.getSavedEvents(userId),
    ]);
    const taste = new Map<string, number>();
    const like = (category: string, weight: number) => taste.set(category, (taste.get(category) ?? 0) + weight);
    const seen = new Set(saved.map((e) => String(e._id))); // already saved or booked: not news
    for (const t of tickets) {
      const e = t.eventId as unknown as TicketEvent | null;
      if (!e) continue;
      seen.add(String(e._id));
      like(e.category, 2);
    }
    for (const e of saved) like(e.category, 1);
    const follows = new Set(following);
    const city = user?.city?.trim().toLowerCase();
    if (!taste.size && !follows.size && !city) return [];

    const upcoming = await EventRepository.find({ status: "published", date: { $gt: new Date() }, organizerId: { $ne: userId } }, { date: 1 }, 200);
    return upcoming
      .filter((e) => !seen.has(String(e._id)) && e.bookedCount < e.capacity)
      .map((e) => {
        const host = e.organizerId as unknown as { _id: Types.ObjectId; name: string };
        const reasons: { score: number; reason: PickReason }[] = [];
        if (follows.has(idOf(host))) reasons.push({ score: 6, reason: { kind: "host", name: host.name } });
        const liked = taste.get(e.category);
        if (liked) reasons.push({ score: 1 + Math.min(liked, 5), reason: { kind: "category", category: e.category } });
        if (city && e.location.toLowerCase() === city) reasons.push({ score: 3, reason: { kind: "city", city: e.location } });
        reasons.sort((a, b) => b.score - a.score);
        // A small lift for events that are selling well
        return { event: e, reason: reasons[0]?.reason, score: reasons.reduce((n, r) => n + r.score, 0) + e.bookedCount / e.capacity };
      })
      .filter((p) => p.reason)
      .sort((a, b) => b.score - a.score || a.event.date.getTime() - b.event.date.getTime())
      .slice(0, 6)
      .map((p) => ({ ...p.event.toObject(), reason: p.reason }));
  }

  async calendarToken(userId: string, reset = false): Promise<string> {
    return UserRepository.calendarToken(userId, reset);
  }

  // The private calendar feed: every event you hold tickets for (from a month ago on). Events that get
  // cancelled stay in as CANCELLED so calendar apps update instead of silently keeping them.
  async calendarFeed(token: string, web: string): Promise<string> {
    const user = await UserRepository.findByCalendarToken(token);
    if (!user) throw new HttpError(404, "Calendar not found");
    const tickets = await TicketRepository.findOwned(String(user._id));
    const since = Date.now() - 30 * 86_400_000;
    type Ev = TicketEvent & { address?: string; meetingLink?: string; platform?: string };
    const byEvent = new Map<string, { ev: Ev; tiers: string[] }>();
    for (const t of tickets) {
      const ev = t.eventId as unknown as Ev | null;
      if (!ev || ev.date.getTime() < since) continue;
      if (t.status !== "valid" && ev.status !== "cancelled") continue; // cancelled booking, or given away
      const entry = byEvent.get(String(ev._id)) ?? { ev, tiers: [] };
      entry.tiers.push(t.tierName);
      byEvent.set(String(ev._id), entry);
    }
    const events: FeedEvent[] = [...byEvent.values()].map(({ ev, tiers }) => {
      const cancelled = ev.status === "cancelled";
      const counts = [...new Set(tiers)].map((name) => `${tiers.filter((x) => x === name).length} × ${name}`).join(", ");
      const online = ev.eventType === "online";
      return {
        id: String(ev._id),
        title: ev.title,
        start: ev.date,
        location: online ? ev.platform || "Online" : [cancelled ? "" : ev.address, ev.location].filter(Boolean).join(", "),
        description: cancelled
          ? "This event was cancelled. Anything you paid is refunded in full."
          : [`Your tickets: ${counts}. Show the live ticket from My Tickets at the door.`, online && ev.meetingLink ? `Join: ${ev.meetingLink}` : "", web ? `${web}/bookings` : ""].filter(Boolean).join("\n"),
        url: web ? `${web}/events/${ev._id}` : "",
        cancelled,
      };
    });
    return calendarFeed(`EventHive: ${user.name.split(" ")[0]}'s tickets`, events);
  }

  // Event passport: your going-out history in numbers, a stamp for each event, and badges to earn
  async passport(userId: string) {
    const [user, tickets, reviews, following] = await Promise.all([
      this.getProfile(userId),
      TicketRepository.findOwned(userId),
      ReviewRepository.countByUser(userId),
      UserRepository.getFollowingIds(userId),
    ]);
    const now = Date.now();
    const been = new Map<string, TicketEvent>();
    const upcoming = new Set<string>();
    for (const t of tickets) {
      const e = t.eventId as unknown as TicketEvent | null;
      if (!e || t.status !== "valid" || e.status === "cancelled") continue;
      if (e.date.getTime() > now) upcoming.add(String(e._id));
      else been.set(String(e._id), e);
    }
    const events = [...been.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
    const cities = [...new Set(events.filter((e) => e.eventType === "venue").map((e) => e.location))];
    const byCategory = new Map<string, number>();
    for (const e of events) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1);
    const categories = [...byCategory].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
    const late = events.filter((e) => hourIn(e.date) >= 21 || hourIn(e.date) < 4).length;
    const badge = (id: string, label: string, hint: string, value: number, goal: number) => ({
      id, label, hint, value: Math.min(value, goal), goal, earned: value >= goal,
    });
    return {
      name: user.name,
      memberSince: user.createdAt,
      stats: {
        events: events.length,
        cities: cities.length,
        hosts: new Set(events.map((e) => idOf(e.organizerId))).size,
        upcoming: upcoming.size,
        reviews,
        following: following.length,
      },
      cities,
      categories,
      badges: [
        badge("first", "First night out", "Go to your first event", events.length, 1),
        badge("regular", "Regular", "Go to 5 events", events.length, 5),
        badge("explorer", "City hopper", "Go to events in 3 cities", cities.length, 3),
        badge("allrounder", "All-rounder", "Try 4 kinds of event", categories.length, 4),
        badge("nightowl", "Night owl", "Go to 2 events that start at 9 pm or later", late, 2),
        badge("critic", "Critic", "Review 3 events you went to", reviews, 3),
        badge("fan", "Superfan", "Follow 3 hosts", following.length, 3),
      ],
      stamps: events.slice(0, 24).map((e) => ({ _id: e._id, title: e.title, date: e.date, location: e.location, category: e.category })),
    };
  }

  async getProfile(id: string): Promise<IUser> {
    const user = await UserRepository.findById(id);
    if (!user) throw new HttpError(404, "User not found");
    return user;
  }

  async updateProfile(id: string, data: { name?: string; city?: string; bio?: string }): Promise<IUser> {
    const user = await UserRepository.update(id, data);
    if (!user) throw new HttpError(404, "User not found");
    return user;
  }

  // Saved (hearted) events. Saving is idempotent; unknown events are a 404.
  async saveEvent(userId: string, eventId: string): Promise<void> {
    const event = await EventService.getEventById(eventId);
    if (event.status === "draft") throw new HttpError(404, "Event not found");
    await UserRepository.addSaved(userId, eventId);
  }

  async unsaveEvent(userId: string, eventId: string): Promise<void> {
    await UserRepository.removeSaved(userId, eventId);
  }

  async getSavedIds(userId: string): Promise<string[]> {
    return UserRepository.getSavedIds(userId);
  }

  async getSavedEvents(userId: string): Promise<IEvent[]> {
    return UserRepository.getSavedEvents(userId);
  }

  // Following a host means hearing about their new events
  async follow(userId: string, hostId: string): Promise<void> {
    if (userId === hostId) throw new HttpError(400, "You can't follow yourself");
    const host = await UserRepository.findPublic(hostId);
    if (!host || host.role !== "organizer") throw new HttpError(404, "Host not found");
    await UserRepository.follow(userId, hostId);
  }

  async unfollow(userId: string, hostId: string): Promise<void> {
    await UserRepository.unfollow(userId, hostId);
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    return UserRepository.getFollowingIds(userId);
  }

  // Everything the event page needs to know about the signed-in visitor, in one call
  async eventViewerState(userId: string, eventId: string) {
    const event = await EventService.getEventById(eventId);
    const [bookings, waitlist, following, saved, hasTicket] = await Promise.all([
      BookingRepository.find({ userId, eventId, status: { $in: ["pending", "confirmed"] } }),
      WaitlistService.position(userId, eventId),
      UserRepository.getFollowingIds(userId),
      UserRepository.getSavedIds(userId),
      TicketRepository.holds(userId, eventId),
    ]);
    const booking = bookings[0];
    return {
      isHost: idOf(event.organizerId) === userId,
      booking: booking ? { _id: booking._id, status: booking.status, quantity: booking.quantity, tierName: booking.tierName } : null,
      hasTicket,
      waitlist,
      following: following.includes(idOf(event.organizerId)),
      saved: saved.includes(eventId),
    };
  }

  // Public host page: profile, followers, rating across all their events, upcoming and past events
  async getHost(hostId: string) {
    const host = await UserRepository.findPublic(hostId);
    if (!host || host.role !== "organizer") throw new HttpError(404, "Host not found");
    const ids = await EventRepository.idsByOrganizer(hostId);
    const now = new Date();
    const [followers, upcoming, past, rating, reviews] = await Promise.all([
      UserRepository.followerCount(hostId),
      EventRepository.find({ organizerId: hostId, status: "published", date: { $gte: now } }, { date: 1 }, 24),
      EventRepository.find({ organizerId: hostId, status: "published", date: { $lt: now } }, { date: -1 }, 6),
      ReviewRepository.statsForEvents(ids),
      ReviewRepository.findByEvents(ids, 6),
    ]);
    return { host, followers, upcoming, past, rating, reviews, eventsHosted: ids.length };
  }

  // Hosts for the home page: verified first, then by followers
  // ponytail: counts per host in a loop; fine for dozens of hosts, aggregate if there are thousands
  async listHosts(limit: number) {
    const hosts = await UserRepository.find({ role: "organizer" }, 100);
    const now = new Date();
    const rows = await Promise.all(
      hosts.map(async (h) => ({
        _id: h._id,
        name: h.name,
        bio: h.bio,
        city: h.city,
        verified: h.verified,
        followers: await UserRepository.followerCount(String(h._id)),
        upcoming: (await EventRepository.find({ organizerId: h._id, status: "published", date: { $gte: now } }, { date: 1 }, 50)).length,
      }))
    );
    return rows.sort((a, b) => Number(b.verified) - Number(a.verified) || b.followers - a.followers).slice(0, limit);
  }

  async referralCount(userId: string): Promise<number> {
    return BookingRepository.referredBy(userId);
  }
}

export default new UserService();
