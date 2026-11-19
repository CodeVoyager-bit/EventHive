import { FilterQuery, Types } from "mongoose";
import EventRepository from "../repositories/EventRepository";
import BookingRepository from "../repositories/BookingRepository";
import TicketRepository from "../repositories/TicketRepository";
import UserRepository from "../repositories/UserRepository";
import WaitlistRepository from "../repositories/WaitlistRepository";
import NotificationService from "./NotificationService";
import { IEvent, IPromoCode, ITier } from "../models/Event";
import { idOf, escapeRegex } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";
import { AuthUser } from "../middleware/auth";
import { CreateEventInput, UpdateEventInput, ListEventsQuery } from "../schemas";

// Day boundaries for organizer stats (the app sells in rupees to an Indian audience)
const TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d); // YYYY-MM-DD
const when = (d: Date) =>
  d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE });

// The UTC instant when calendar day `d` (taken as Y-M-D) starts in the app's time zone
function zonedDayStart(d: Date): Date {
  const guess = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, Number(p.value)])
  );
  const asLocal = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return new Date(guess - (asLocal - guess)); // shift by the zone's offset at that moment
}

const SORTS = {
  date: { date: 1 },
  "price-asc": { price: 1, date: 1 },
  "price-desc": { price: -1, date: 1 },
  popular: { bookedCount: -1, date: 1 },
} as const;

type TierInput = NonNullable<CreateEventInput["tiers"]>[number];
type PromoInput = NonNullable<CreateEventInput["promoCodes"]>[number];

// "Priya Nair" -> "Priya N." for the public guest list
const shortName = (name: string) => {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
};

class EventService {
  // Turns requested tiers into stored tiers. Editing keeps what is already sold: capacity can't drop
  // below sales, and a tier with sales can't be removed.
  private mergeTiers(input: TierInput[], existing: ITier[] = []): ITier[] {
    const byId = new Map(existing.map((t) => [String(t._id), t]));
    const kept = new Set<string>();
    const tiers = input.map((t) => {
      const old = t._id ? byId.get(t._id) : undefined;
      if (t._id && !old) throw new HttpError(400, `Unknown ticket tier: ${t.name}`);
      const sold = old ? old.capacity - old.remaining : 0;
      if (t.capacity < sold) throw new HttpError(400, `${t.name}: ${sold} tickets are already sold, so capacity can't be lower`);
      if (old) kept.add(String(old._id));
      return {
        _id: old?._id ?? new Types.ObjectId(),
        name: t.name,
        description: t.description,
        price: t.price,
        capacity: t.capacity,
        remaining: t.capacity - sold,
        salesEnd: t.salesEnd ?? undefined,
        maxPerOrder: t.maxPerOrder,
      };
    });
    for (const t of existing) {
      if (!kept.has(String(t._id)) && t.capacity > t.remaining) {
        throw new HttpError(400, `${t.name} can't be removed because tickets have been sold`);
      }
    }
    return tiers;
  }

  // Promo codes keep their used count when the list is edited
  private mergePromos(input: PromoInput[], existing: IPromoCode[] = []): IPromoCode[] {
    const used = new Map(existing.map((p) => [p.code, p.limit - p.remaining]));
    return input.map((p) => ({
      code: p.code,
      kind: p.kind,
      amount: p.amount,
      limit: p.limit,
      remaining: Math.max(0, p.limit - (used.get(p.code) ?? 0)),
      expiresAt: p.expiresAt ?? undefined,
    }));
  }

  private totals(tiers: ITier[]) {
    return {
      capacity: tiers.reduce((n, t) => n + t.capacity, 0),
      bookedCount: tiers.reduce((n, t) => n + t.capacity - t.remaining, 0),
      price: Math.min(...tiers.map((t) => t.price)),
    };
  }

  // Rules an event must meet before guests can see it (the client shows the same list as a checklist)
  private assertPublishable(e: Pick<IEvent, "eventType" | "address" | "meetingLink" | "tiers" | "date">, checkDate = true) {
    if (checkDate && !(new Date(e.date) > new Date())) throw new HttpError(400, "Before publishing, move the date into the future");
    const missing: string[] = [];
    if (e.eventType === "venue" && !e.address?.trim()) missing.push("a venue address");
    if (e.eventType === "online" && !e.meetingLink?.trim()) missing.push("a join link");
    if (!e.tiers?.length) missing.push("at least one ticket tier");
    if (missing.length) throw new HttpError(400, `Before publishing, add ${missing.join(" and ")}`);
  }

  // Tickets have to go on sale before the doors open
  private assertSalesWindow(e: { salesStart?: Date | null; date: Date }) {
    if (e.salesStart && e.salesStart >= e.date) throw new HttpError(400, "Tickets must go on sale before the event starts");
  }

  async createEvent(data: CreateEventInput, organizerId: string): Promise<IEvent> {
    const { tiers, price, capacity, promoCodes, questions, status, ...rest } = data;
    const stored = this.mergeTiers(tiers ?? [{ name: "General", price: price ?? 0, capacity: capacity ?? 1, maxPerOrder: 6 }]);
    const doc = {
      ...rest,
      status,
      tiers: stored,
      ...this.totals(stored),
      promoCodes: this.mergePromos(promoCodes ?? []),
      questions: (questions ?? []).map((q) => ({ label: q.label, required: q.required })),
      organizerId: new Types.ObjectId(organizerId),
      publishedAt: status === "published" ? new Date() : undefined,
    };
    this.assertSalesWindow(doc);
    if (status === "published") this.assertPublishable(doc as unknown as IEvent);
    const event = await EventRepository.create(doc as unknown as Partial<IEvent>);
    if (status === "published") await this.announceToFollowers(event, organizerId);
    return event;
  }

  async getEventById(id: string): Promise<IEvent> {
    const event = await EventRepository.findById(id);
    if (!event) throw new HttpError(404, "Event not found");
    return event;
  }

  // Loads an event and checks the requester may manage it (its organizer, or an admin)
  async getOwnedEvent(id: string, user: AuthUser, opts: { withPromos?: boolean; withTeam?: boolean } = {}): Promise<IEvent> {
    const event = await EventRepository.findById(id, opts);
    if (!event) throw new HttpError(404, "Event not found");
    if (user.role !== "admin" && idOf(event.organizerId) !== user.id) {
      throw new HttpError(403, "You can only manage your own events");
    }
    return event;
  }

  // The public event page. Hosts also get their promo codes; secret addresses and online join
  // links are only revealed to confirmed ticket holders.
  async getPublicEvent(id: string, viewer?: AuthUser) {
    const event = await EventRepository.findById(id, { withPromos: true });
    if (!event) throw new HttpError(404, "Event not found");
    const isHost = !!viewer && (viewer.role === "admin" || idOf(event.organizerId) === viewer.id);
    if (!isHost && event.status === "draft") throw new HttpError(404, "Event not found");
    const hasTicket = !!viewer && !isHost && (await TicketRepository.holds(viewer.id, id));
    const obj = event.toObject() as unknown as Record<string, unknown>;
    if (!isHost) delete obj.promoCodes;
    if (!isHost && !hasTicket) {
      delete obj.meetingLink;
      if (event.secretLocation) {
        delete obj.address;
        delete obj.mapLocation;
      }
    }
    return obj;
  }

  async listEvents(q: ListEventsQuery): Promise<{ items: IEvent[]; total: number }> {
    const filter: FilterQuery<IEvent> = { status: "published" };
    if (q.category) filter.category = q.category;
    if (q.eventType) filter.eventType = q.eventType;
    if (q.city) {
      if (q.city.toLowerCase() === "online") filter.eventType = "online";
      else filter.location = new RegExp(`^${escapeRegex(q.city)}$`, "i");
    }
    // Upcoming by default; a "to" on its own reaches into the past. Days are the app's calendar days.
    const now = new Date();
    const date: Record<string, Date> = {};
    const fromStart = q.from ? zonedDayStart(q.from) : null;
    const toEnd = q.to ? new Date(zonedDayStart(q.to).getTime() + 86_400_000) : null; // include the whole "to" day
    if (fromStart) {
      // A window that includes right now starts now ("Tonight" skips what already began); a window
      // entirely in the past is browsing history, so it keeps its start
      date.$gte = fromStart <= now && (!toEnd || toEnd > now) ? now : fromStart;
    }
    if (toEnd) date.$lt = toEnd;
    if (!q.from && !q.to) date.$gte = now;
    filter.date = date;
    if (q.q) {
      // ponytail: regex scan over four fields; switch to a text index if the catalogue grows
      const rx = new RegExp(escapeRegex(q.q), "i");
      filter.$or = [{ title: rx }, { description: rx }, { location: rx }, { category: rx }];
    }
    if (q.maxPrice !== undefined) filter.price = { $lte: q.maxPrice };
    return EventRepository.findPaged(filter, q.page, q.limit, { ...SORTS[q.sort] });
  }

  async getCities() {
    return EventRepository.cityCounts();
  }

  // "Who's going": the count and a few first names (never emails); hosts can hide the names
  async getSocial(id: string) {
    const event = await this.getEventById(id);
    const [going, interested, names, waiting] = await Promise.all([
      TicketRepository.countValid(id),
      UserRepository.interestedCount(id),
      event.showGuests ? TicketRepository.guestNames(id, 8) : Promise.resolve([]),
      WaitlistRepository.countWaiting(id),
    ]);
    return { going, interested, waiting, showGuests: event.showGuests, guests: names.map(shortName) };
  }

  async getEventsByOrganizer(organizerId: string): Promise<(IEvent & { revenue: number; pending: number })[]> {
    const events = await EventRepository.findByOrganizer(organizerId);
    const totals = await BookingRepository.totalsByEvents(events.map((e) => e._id));
    return events.map((event) => {
      const t = totals.get(String(event._id));
      return Object.assign(event.toObject(), { revenue: t?.revenue ?? 0, pending: t?.pending ?? 0 }) as IEvent & { revenue: number; pending: number };
    });
  }

  private async dailySeries(eventIds: Types.ObjectId[], days: number) {
    const since = new Date(Date.now() - (days - 1) * 86_400_000);
    since.setUTCHours(0, 0, 0, 0);
    const rows = await BookingRepository.dailyTotals(eventIds, since, TIME_ZONE);
    const byDay = new Map(rows.map((r) => [r._id, r]));
    return Array.from({ length: days }, (_, i) => {
      const date = dayKey(new Date(Date.now() - (days - 1 - i) * 86_400_000));
      const row = byDay.get(date);
      return { date, bookings: row?.bookings ?? 0, tickets: row?.tickets ?? 0, revenue: row?.revenue ?? 0 };
    });
  }

  // Bookings and revenue per day over the last `days` days, zero-filled, across the organizer's events
  async getOrganizerStats(organizerId: string, days: number) {
    const ids = await EventRepository.idsByOrganizer(organizerId);
    const [daily, followers] = await Promise.all([this.dailySeries(ids, days), UserRepository.followerCount(organizerId)]);
    return { timeZone: TIME_ZONE, daily, followers };
  }

  // One event's dashboard: sales by day, tiers, check-in rate, referrers, promo usage
  async getAnalytics(id: string, user: AuthUser) {
    const event = await this.getOwnedEvent(id, user, { withPromos: true });
    const [tierRows, checkIn, referrers, waiting, pending, daily, revenue] = await Promise.all([
      BookingRepository.tierTotals(id),
      TicketRepository.checkInCounts(id),
      BookingRepository.topReferrers(id),
      WaitlistRepository.countWaiting(id),
      BookingRepository.countByEvent(id, "pending"),
      this.dailySeries([event._id], 30),
      BookingRepository.getRevenueByEvent(id),
    ]);
    const revenueByTier = new Map(tierRows.map((r) => [String(r._id), r.revenue]));
    const bookings = daily.reduce((n, d) => n + d.bookings, 0);
    return {
      timeZone: TIME_ZONE,
      revenue,
      views: event.views ?? 0,
      // % of viewers who booked (30 days); capped because bookings made before view tracking began have no view
      conversion: event.views ? Math.min(100, Math.round((bookings / event.views) * 1000) / 10) : null,
      sold: event.bookedCount,
      capacity: event.capacity,
      tiers: event.tiers.map((t) => ({
        _id: t._id,
        name: t.name,
        price: t.price,
        capacity: t.capacity,
        sold: t.capacity - t.remaining,
        revenue: revenueByTier.get(String(t._id)) ?? 0,
      })),
      checkIn,
      referrers,
      waiting,
      pending,
      promos: (event.promoCodes ?? []).map((p) => ({ code: p.code, used: p.limit - p.remaining, limit: p.limit })),
      daily,
    };
  }

  async updateEvent(id: string, user: AuthUser, data: UpdateEventInput): Promise<IEvent> {
    const event = await this.getOwnedEvent(id, user, { withPromos: true });
    if (event.status === "cancelled") throw new HttpError(409, "A cancelled event can't be edited");
    const wasPublished = event.status === "published";
    const before = { date: event.date.getTime(), location: event.location, address: event.address, link: event.meetingLink };

    const { tiers, price, capacity, promoCodes, questions, status, ...rest } = data;
    if (rest.date && rest.date.getTime() !== before.date && rest.date <= new Date()) {
      throw new HttpError(400, "The new date must be in the future");
    }
    event.set(rest);
    let input = tiers;
    if (!input && (price !== undefined || capacity !== undefined) && event.tiers.length === 1) {
      const t = event.tiers[0];
      input = [{ _id: String(t._id), name: t.name, description: t.description, price: price ?? t.price, capacity: capacity ?? t.capacity, salesEnd: t.salesEnd, maxPerOrder: t.maxPerOrder }];
    }
    if (input) {
      const merged = this.mergeTiers(input, event.tiers);
      event.set("tiers", merged);
      event.set(this.totals(merged));
    }
    if (promoCodes) event.set("promoCodes", this.mergePromos(promoCodes, event.promoCodes));
    if (questions) {
      event.set("questions", questions.map((q) => ({ _id: q._id ? new Types.ObjectId(q._id) : new Types.ObjectId(), label: q.label, required: q.required })));
    }
    if (status === "draft" && wasPublished && event.bookedCount > 0) {
      throw new HttpError(409, "People have booked this event, so it can't go back to draft");
    }
    if (status) event.status = status;
    this.assertSalesWindow(event);
    const publishingNow = event.status === "published" && !event.publishedAt;
    if (event.status === "published") this.assertPublishable(event, publishingNow || event.date.getTime() !== before.date);
    if (publishingNow) event.publishedAt = new Date();
    // optimisticConcurrency: if a booking changed seat counts since we loaded, this throws (409)
    const saved = await EventRepository.save(event);

    if (wasPublished) await this.tellHoldersWhatChanged(saved, before);
    if (publishingNow) await this.announceToFollowers(saved, idOf(saved.organizerId));
    return saved;
  }

  private async tellHoldersWhatChanged(e: IEvent, before: { date: number; location: string; address?: string; link?: string }) {
    const changes: string[] = [];
    if (e.date.getTime() !== before.date) changes.push(`New time: ${when(e.date)}.`);
    if (e.location !== before.location || (e.address ?? "") !== (before.address ?? "")) {
      changes.push(`New venue: ${[e.address, e.location].filter(Boolean).join(", ")}.`);
    }
    if ((e.meetingLink ?? "") !== (before.link ?? "")) changes.push("The join link has changed.");
    if (!changes.length) return;
    const holders = await TicketRepository.holderIds(String(e._id));
    await NotificationService.notify(holders, {
      kind: "event_updated",
      title: `${e.title} has changed`,
      body: changes.join(" "),
      link: `/events/${e._id}`,
    });
  }

  private async announceToFollowers(e: IEvent, hostId: string) {
    const [followers, host] = await Promise.all([UserRepository.followerIds(hostId), UserRepository.findPublic(hostId)]);
    await NotificationService.notify(followers, {
      kind: "new_event",
      title: `${host?.name ?? "A host you follow"} just announced ${e.title}`,
      body: `${when(e.date)} in ${e.location}.`,
      link: `/events/${e._id}`,
    });
  }

  // ponytail: unauthenticated counter, deduped per browser session on the client; good enough for a
  // host's conversion rate, not for billing
  async recordView(id: string): Promise<void> {
    await EventRepository.incViews(id);
  }

  // "Run it again": a draft copy with the same tiers (fresh capacity), questions, policies and
  // promo codes (uses reset), a week after the original
  async duplicateEvent(id: string, user: AuthUser): Promise<IEvent> {
    const src = await this.getOwnedEvent(id, user, { withPromos: true });
    const WEEK = 7 * 86_400_000;
    let date = new Date(src.date.getTime() + WEEK);
    while (date <= new Date()) date = new Date(date.getTime() + WEEK); // same weekday and time, in the future
    const tiers = src.tiers.map((t) => ({ name: t.name, description: t.description, price: t.price, capacity: t.capacity, remaining: t.capacity, maxPerOrder: t.maxPerOrder, _id: new Types.ObjectId() }));
    return EventRepository.create({
      title: src.title,
      description: src.description,
      date,
      location: src.location,
      category: src.category,
      imageUrl: src.imageUrl,
      eventType: src.eventType,
      meetingLink: src.meetingLink,
      platform: src.platform,
      address: src.address,
      mapLocation: src.mapLocation,
      requiresApproval: src.requiresApproval,
      secretLocation: src.secretLocation,
      showGuests: src.showGuests,
      absorbFees: src.absorbFees,
      refundPolicy: src.refundPolicy,
      groupDiscount: src.groupDiscount,
      // Same lead time as the original (on sale right away if that's already passed)
      salesStart: src.salesStart ? new Date(src.salesStart.getTime() + (date.getTime() - src.date.getTime())) : undefined,
      tiers,
      ...this.totals(tiers as ITier[]),
      promoCodes: (src.promoCodes ?? []).map((p) => ({ code: p.code, kind: p.kind, amount: p.amount, limit: p.limit, remaining: p.limit })),
      questions: src.questions.map((q) => ({ label: q.label, required: q.required })),
      organizerId: new Types.ObjectId(idOf(src.organizerId)),
      status: "draft",
    } as unknown as Partial<IEvent>);
  }

  // Deleting is for drafts and events nobody booked; otherwise cancel, so guests get refunds
  async deleteEvent(id: string, user: AuthUser): Promise<void> {
    await this.getOwnedEvent(id, user);
    const [active, tickets] = await Promise.all([BookingRepository.find({ eventId: id, status: { $in: ["pending", "confirmed"] } }), TicketRepository.countValid(id)]);
    if (active.length || tickets) {
      throw new HttpError(409, "This event has bookings. Cancel it instead so everyone is refunded and told.");
    }
    await EventRepository.delete(id);
  }
}

export default new EventService();
