import { Types } from "mongoose";
import NotificationRepository from "../repositories/NotificationRepository";
import TicketRepository from "../repositories/TicketRepository";
import UserRepository from "../repositories/UserRepository";
import { INotification, NotificationKind } from "../models/Notification";
import { idOf } from "../lib/util";

type Note = { kind: NotificationKind; title: string; body?: string; link?: string };
type Recipient = string | Types.ObjectId | null | undefined;

const DAY = 86_400_000;

class NotificationService {
  // Fire-and-forget from the caller's point of view: a failed notification never fails the action
  async notify(recipients: Recipient[], note: Note): Promise<void> {
    const ids = [...new Set(recipients.filter(Boolean).map((r) => idOf(r)))];
    try {
      await NotificationRepository.insertMany(
        ids.map((id) => ({ userId: new Types.ObjectId(id), body: "", link: "/", ...note }))
      );
    } catch (err) {
      console.error("notify failed", err);
    }
  }

  async list(userId: string, limit: number): Promise<{ items: INotification[]; unread: number }> {
    await Promise.all([this.ensureReminders(userId), this.ensureWatchAlerts(userId)]);
    const [items, unread] = await Promise.all([
      NotificationRepository.list(userId, limit),
      NotificationRepository.unreadCount(userId),
    ]);
    return { items, unread };
  }

  async unreadCount(userId: string): Promise<number> {
    await Promise.all([this.ensureReminders(userId), this.ensureWatchAlerts(userId)]);
    return NotificationRepository.unreadCount(userId);
  }

  async markRead(userId: string, id?: string): Promise<void> {
    await NotificationRepository.markRead(userId, id);
  }

  // Saved events that are about to slip away: nearly sold out, or an early-bird price ending within a
  // day. Each alert is sent once per event (dedupe keys), and only for events you can still book.
  private async ensureWatchAlerts(userId: string): Promise<void> {
    const [saved, mine] = await Promise.all([UserRepository.getSavedEvents(userId), TicketRepository.findOwned(userId)]);
    const going = new Set(mine.filter((t) => t.status === "valid").map((t) => idOf(t.eventId)));
    const now = Date.now();
    const jobs: Promise<void>[] = [];
    for (const e of saved) {
      if (e.status !== "published" || e.date.getTime() <= now || going.has(String(e._id))) continue;
      // "Notify me": saving an event before sales open asks to hear when they do
      const opens = e.salesStart?.getTime();
      if (opens && opens <= now && now - opens <= 3 * DAY) {
        jobs.push(
          NotificationRepository.upsertOnce(`onsale:${userId}:${e._id}`, {
            userId: new Types.ObjectId(userId),
            kind: "on_sale",
            title: `Tickets are on sale: ${e.title}`,
            body: "You asked to hear when tickets opened. Grab yours before they go.",
            link: `/events/${e._id}`,
            createdAt: new Date(opens),
          })
        );
      }
      const left = e.capacity - e.bookedCount;
      if (left > 0 && left <= Math.max(3, Math.ceil(e.capacity * 0.1))) {
        jobs.push(
          NotificationRepository.upsertOnce(`almost:${userId}:${e._id}`, {
            userId: new Types.ObjectId(userId),
            kind: "almost_gone",
            title: `Almost gone: ${e.title}`,
            body: `Only ${left} ${left === 1 ? "seat" : "seats"} left for an event you saved.`,
            link: `/events/${e._id}`,
            createdAt: new Date(),
          })
        );
      }
      for (const t of e.tiers ?? []) {
        const ends = t.salesEnd?.getTime();
        if (ends && ends > now && ends - now <= DAY && t.remaining > 0) {
          jobs.push(
            NotificationRepository.upsertOnce(`earlybird:${userId}:${e._id}:${t._id}`, {
              userId: new Types.ObjectId(userId),
              kind: "price_ending",
              title: `${t.name} ends soon: ${e.title}`,
              body: `The ${t.name} price for an event you saved ends within a day.`,
              link: `/events/${e._id}`,
              createdAt: new Date(),
            })
          );
        }
      }
    }
    await Promise.all(jobs);
  }

  // "Starts tomorrow" reminders, created lazily when the user next looks (no scheduler needed).
  // ponytail: runs on read; a cron job would let reminders arrive without opening the app.
  private async ensureReminders(userId: string): Promise<void> {
    const now = Date.now();
    const tickets = await TicketRepository.findOwned(userId);
    const soon = new Map<string, { title: string; date: Date }>();
    for (const t of tickets) {
      const ev = t.eventId as unknown as { _id: Types.ObjectId; title: string; date: Date; status: string } | null;
      if (!ev || t.status !== "valid" || ev.status === "cancelled") continue;
      const ms = new Date(ev.date).getTime() - now;
      if (ms > 0 && ms <= DAY) soon.set(String(ev._id), { title: ev.title, date: ev.date });
    }
    await Promise.all(
      [...soon].map(([eventId, ev]) =>
        NotificationRepository.upsertOnce(`reminder:${userId}:${eventId}`, {
          userId: new Types.ObjectId(userId),
          kind: "reminder",
          title: `${ev.title} starts soon`,
          body: `Doors at ${new Date(ev.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata" })}. Your ticket is ready in My Tickets.`,
          link: "/bookings",
          createdAt: new Date(),
        })
      )
    );
  }
}

export default new NotificationService();
