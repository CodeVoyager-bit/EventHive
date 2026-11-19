import { Types } from "mongoose";
import BookingRepository from "../repositories/BookingRepository";
import EventRepository from "../repositories/EventRepository";
import TicketRepository from "../repositories/TicketRepository";
import UserRepository from "../repositories/UserRepository";
import WaitlistRepository from "../repositories/WaitlistRepository";
import EventService from "./EventService";
import TicketService from "./TicketService";
import NotificationService from "./NotificationService";
import { MockStripeGateway, IPaymentGateway, PaymentResult } from "../interfaces/IPaymentGateway";
import { ACTIVE_STATUSES, IBooking } from "../models/Booking";
import { IEvent, ITier } from "../models/Event";
import { quote as priceQuote } from "../domain/pricing";
import { refundFor, refundPolicyFor } from "../domain/policies";
import { idOf } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";
import { AuthUser } from "../middleware/auth";

type OrderInput = { tierId?: string; quantity: number; promoCode?: string; protection: boolean; viaWaitlist?: boolean };
export type BookingInput = OrderInput & {
  eventId: string;
  names?: string[];
  answers: { questionId: string; answer: string }[];
  ref?: string;
  followHost: boolean;
};

const onSale = (t: ITier, now: Date) => !t.salesEnd || t.salesEnd > now;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

class BookingService {
  private paymentGateway: IPaymentGateway;

  constructor() {
    // Abstraction: payment gateway can be swapped without changing booking logic
    this.paymentGateway = new MockStripeGateway();
  }

  // Picks the tier, checks the promo code and prices the order. Throws a 4xx that says what's wrong.
  private priceOrder(event: IEvent, input: OrderInput) {
    const now = new Date();
    const tier = input.tierId
      ? event.tiers.id(input.tierId)
      : event.tiers.find((t) => onSale(t, now) && t.remaining > 0) ?? event.tiers.find((t) => onSale(t, now));
    if (!tier) throw new HttpError(404, "Ticket tier not found");
    if (!onSale(tier, now)) throw new HttpError(400, `${tier.name} sales have ended`);
    if (input.quantity > tier.maxPerOrder) {
      throw new HttpError(400, `You can book up to ${plural(tier.maxPerOrder, "ticket")} for ${tier.name} at once`);
    }
    let promo = null;
    if (input.promoCode) {
      // One message for unknown, expired and used-up codes, so the public quote can't probe which exist.
      // ponytail: no rate limit on /quote; put one at the edge (the API only sees the web server's IP)
      promo = (event.promoCodes ?? []).find((p) => p.code === input.promoCode) ?? null;
      if (!promo || (promo.expiresAt && promo.expiresAt < now) || promo.remaining <= 0) {
        throw new HttpError(400, "That promo code isn't valid for this event");
      }
      if (tier.price === 0) throw new HttpError(400, "Promo codes only apply to paid tickets");
    }
    const pricing = priceQuote({
      unitPrice: tier.price,
      quantity: input.quantity,
      promo,
      group: event.groupDiscount?.minQty ? event.groupDiscount : null,
      protection: input.protection || !!input.viaWaitlist,
      freeProtection: !!input.viaWaitlist,
      absorbFees: event.absorbFees,
    });
    return { tier, promo, pricing };
  }

  private async loadForSale(eventId: string): Promise<IEvent> {
    const event = await EventRepository.findById(eventId, { withPromos: true });
    if (!event) throw new HttpError(404, "Event not found");
    if (event.status !== "published") throw new HttpError(400, "Event is not available");
    if (event.date <= new Date()) throw new HttpError(400, "This event has already started");
    if (event.salesStart && event.salesStart > new Date()) {
      const when = event.salesStart.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata" });
      throw new HttpError(409, `Tickets go on sale ${when}`);
    }
    return event;
  }

  // Live price for the checkout panel (validates promo codes as you type)
  async quote(eventId: string, input: OrderInput) {
    const event = await this.loadForSale(eventId);
    const { tier, promo, pricing } = this.priceOrder(event, input);
    return {
      tierId: tier._id,
      tierName: tier.name,
      unitPrice: tier.price,
      quantity: input.quantity,
      promoCode: promo?.code ?? null,
      ...pricing,
      refundPolicy: refundPolicyFor(event.refundPolicy).label,
    };
  }

  async createBooking(userId: string, input: BookingInput): Promise<IBooking> {
    const event = await this.loadForSale(input.eventId);
    if (idOf(event.organizerId) === userId) throw new HttpError(400, "You can't book your own event");
    if (await BookingRepository.hasActive(userId, input.eventId)) {
      throw new HttpError(409, "You already have a booking for this event");
    }
    const answers = event.questions
      .map((q) => {
        const answer = input.answers.find((a) => a.questionId === String(q._id))?.answer?.trim() ?? "";
        if (q.required && !answer && !input.viaWaitlist) throw new HttpError(400, `Please answer: ${q.label}`);
        return { question: q.label, answer };
      })
      .filter((a) => a.answer);
    const { tier, promo, pricing } = this.priceOrder(event, input);
    const buyer = await UserRepository.findById(userId);
    if (!buyer) throw new HttpError(401, "Authentication required");
    const referrer = input.ref && input.ref !== userId ? await UserRepository.findPublic(input.ref) : null;

    // Concurrency-safe: seats (and a promo use) are taken in one atomic update
    const tierId = String(tier._id);
    if (!(await EventRepository.reserveSeats(input.eventId, tierId, input.quantity, promo?.code))) {
      const fresh = await EventRepository.findById(input.eventId);
      const left = fresh?.tiers.id(tierId)?.remaining ?? 0;
      if (left < input.quantity) {
        throw new HttpError(409, left > 0 ? `Only ${left} ${tier.name} left` : `${tier.name} is sold out`);
      }
      throw new HttpError(409, "That promo code has just been used up");
    }

    let booking: IBooking | null = null;
    let payment: PaymentResult | null = null;
    try {
      const pending = event.requiresApproval;
      // Approval events are charged when the host approves (like an authorised card hold)
      payment = !pending && pricing.total > 0 ? await this.paymentGateway.processPayment(pricing.total, userId) : null;
      if (payment && !payment.success) {
        payment = null;
        throw new HttpError(402, "Payment failed. You haven't been charged.");
      }
      booking = await BookingRepository.create({
        userId: new Types.ObjectId(userId),
        eventId: event._id,
        status: pending ? "pending" : "confirmed",
        tierId: tier._id,
        tierName: tier.name,
        quantity: input.quantity,
        unitPrice: tier.price,
        promoCode: promo?.code,
        protection: input.protection || !!input.viaWaitlist,
        refundPolicy: event.refundPolicy,
        pricing,
        amount: pricing.subtotal - pricing.discount,
        answers,
        holderNames: input.names ?? [],
        referrerId: referrer ? (referrer._id as Types.ObjectId) : undefined,
        viaWaitlist: !!input.viaWaitlist,
        transactionId: payment?.transactionId,
      });
      if (pending) {
        await NotificationService.notify([event.organizerId], {
          kind: "booking_request",
          title: `${buyer.name} asked to join ${event.title}`,
          body: `${plural(input.quantity, "ticket")}, ${tier.name}. Approve or decline from your guest list.`,
          link: `/dashboard/${event._id}/attendees`,
        });
      } else {
        await TicketService.issue(booking, buyer.name);
      }
      if (!input.viaWaitlist) await WaitlistRepository.leave(input.eventId, userId); // booked directly: out of the line
      if (input.followHost) await UserRepository.follow(userId, idOf(event.organizerId));
      return booking;
    } catch (err) {
      // Undo everything this attempt did: the booking, its tickets, the charge, the seats and the promo use
      if (booking) {
        await BookingRepository.transition(String(booking._id), ACTIVE_STATUSES, { status: "cancelled", cancelledAt: new Date(), refundAmount: pricing.total });
        await TicketRepository.voidByBooking(booking._id);
      }
      if (payment?.transactionId) await this.paymentGateway.refundPayment(payment.transactionId, pricing.total);
      await EventRepository.releaseSeats(input.eventId, tierId, input.quantity, promo?.code);
      if ((err as { code?: number }).code === 11000) {
        throw new HttpError(409, "You already have a booking for this event"); // lost a race with a parallel request
      }
      throw err;
    }
  }

  // Cancels one booking without racing an approve or another cancel: the transition only applies
  // from the status we just read, and retries if it changed. The winner refunds, voids tickets and
  // gives back the seats and promo use, exactly once.
  private async cancelAtomically(bookingId: string, refundOf: (b: IBooking) => number) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const before = await BookingRepository.findRaw(bookingId);
      if (!before || !ACTIVE_STATUSES.includes(before.status)) return null;
      const refund = refundOf(before);
      const after = await BookingRepository.transition(bookingId, [before.status], { status: "cancelled", cancelledAt: new Date(), refundAmount: refund });
      if (!after) continue;
      if (refund > 0 && before.transactionId) await this.paymentGateway.refundPayment(before.transactionId, refund);
      await TicketRepository.voidByBooking(before._id);
      await EventRepository.releaseSeats(idOf(before.eventId), String(before.tierId), before.quantity, before.promoCode);
      return after;
    }
    throw new HttpError(409, "This booking just changed. Reload and try again.");
  }

  // Host approves a request: the approval wins first, then payment is captured and tickets issued
  async approve(bookingId: string, user: AuthUser): Promise<IBooking> {
    const booking = await BookingRepository.findRaw(bookingId);
    if (!booking) throw new HttpError(404, "Booking not found");
    const event = await EventService.getOwnedEvent(idOf(booking.eventId), user);
    if (event.status !== "published") throw new HttpError(409, "This event isn't taking bookings");
    if (event.date <= new Date()) throw new HttpError(400, "This event has already started");
    const approved = await BookingRepository.transition(bookingId, ["pending"], { status: "confirmed", decidedAt: new Date() });
    if (!approved) throw new HttpError(409, "This request was already handled");

    let result = approved;
    const total = approved.pricing.total;
    if (total > 0) {
      const payment = await this.paymentGateway.processPayment(total, idOf(booking.userId));
      if (!payment.success) {
        await BookingRepository.transition(bookingId, ["confirmed"], { status: "pending" });
        throw new HttpError(402, "The guest's payment failed. The request is still pending.");
      }
      // If the guest withdrew in the meantime, give the money straight back
      const charged = await BookingRepository.transition(bookingId, ["confirmed"], { transactionId: payment.transactionId });
      if (!charged) {
        await this.paymentGateway.refundPayment(payment.transactionId, total);
        throw new HttpError(409, "The guest withdrew this request");
      }
      result = charged;
    }
    const buyer = await UserRepository.findPublic(idOf(booking.userId));
    await TicketService.issue(approved, buyer?.name ?? "Guest");
    // A cancel that landed while tickets were being issued: those tickets must not work
    if ((await BookingRepository.findRaw(bookingId))?.status !== "confirmed") {
      await TicketRepository.voidByBooking(approved._id);
      throw new HttpError(409, "The guest withdrew this request");
    }
    await NotificationService.notify([booking.userId], {
      kind: "booking_approved",
      title: `You're in: ${event.title}`,
      body: event.secretLocation ? "The host approved your request. The address is now on your ticket." : "The host approved your request. Your tickets are ready.",
      link: "/bookings",
    });
    return result;
  }

  async decline(bookingId: string, user: AuthUser): Promise<IBooking> {
    const booking = await BookingRepository.findRaw(bookingId);
    if (!booking) throw new HttpError(404, "Booking not found");
    const event = await EventService.getOwnedEvent(idOf(booking.eventId), user);
    const declined = await BookingRepository.transition(bookingId, ["pending"], { status: "declined", decidedAt: new Date() });
    if (!declined) throw new HttpError(409, "This request was already handled");
    await EventRepository.releaseSeats(idOf(event), String(booking.tierId), booking.quantity, booking.promoCode);
    await NotificationService.notify([booking.userId], {
      kind: "booking_declined",
      title: `Your request for ${event.title} wasn't accepted`,
      body: "You haven't been charged. There are plenty more events this week.",
      link: "/events",
    });
    await this.promoteWaitlist(idOf(event));
    return declined;
  }

  // Guest cancels. Refund follows the policy the booking was sold under, or Refund Protection.
  async cancelBooking(bookingId: string, userId: string): Promise<IBooking> {
    const booking = await BookingRepository.findById(bookingId);
    if (!booking) throw new HttpError(404, "Booking not found");
    if (idOf(booking.userId) !== userId) throw new HttpError(403, "This booking is not yours");
    if (!ACTIVE_STATUSES.includes(booking.status)) throw new HttpError(400, "Booking is already cancelled");

    // eventId is populated by the repository; it is null if the event was deleted
    const event = booking.eventId as unknown as Pick<IEvent, "_id" | "date" | "refundPolicy"> | null;
    if (event && event.date <= new Date()) {
      throw new HttpError(400, "Bookings cannot be cancelled once the event has started");
    }
    if (await TicketRepository.anyCheckedIn(booking._id)) {
      throw new HttpError(409, "A ticket from this booking has already been used at the door");
    }
    if (await TicketRepository.anyTransferred(booking._id)) {
      throw new HttpError(409, "You've sent a ticket from this booking to someone, so it can't be cancelled");
    }

    const cancelled = await this.cancelAtomically(bookingId, (b) =>
      b.status === "pending" || !event
        ? 0
        : refundFor(b.pricing, { eventDate: event.date, policy: b.refundPolicy ?? event.refundPolicy, protection: b.protection })
    );
    if (!cancelled) throw new HttpError(400, "Booking is already cancelled");
    if (event) await this.promoteWaitlist(idOf(event));
    return cancelled;
  }

  // Seats just freed up: book them for the people waiting, oldest first, skipping parties that
  // don't fit (Meetup-style). Waitlist bookings get Refund Protection free, so they can back out.
  // ponytail: sequential loop on the request path; a queue worker would suit very long waitlists
  async promoteWaitlist(eventId: string): Promise<void> {
    const entries = await WaitlistRepository.waiting(eventId);
    if (!entries.length) return;
    const event = await EventRepository.findById(eventId);
    if (!event || event.status !== "published" || event.date <= new Date()) return;
    for (const entry of entries) {
      const tier = event.tiers.id(entry.tierId);
      if (!tier) {
        await WaitlistRepository.markLeft(entry._id);
        continue;
      }
      if (tier.remaining < entry.quantity) continue;
      try {
        const booking = await this.createBooking(String(entry.userId), {
          eventId,
          tierId: String(entry.tierId),
          quantity: entry.quantity,
          protection: true,
          viaWaitlist: true,
          answers: [],
          followHost: false,
        });
        tier.remaining -= entry.quantity;
        await WaitlistRepository.markPromoted(entry._id, booking._id);
        await NotificationService.notify([entry.userId], {
          kind: "waitlist_promoted",
          title: `A spot opened up: ${event.title}`,
          body: event.requiresApproval
            ? "You're off the waitlist and your request is with the host."
            : `We booked ${plural(entry.quantity, "ticket")} for you. Refund Protection is on us if you can't make it.`,
          link: "/bookings",
        });
      } catch (err) {
        if (err instanceof HttpError && err.status === 409 && !/already have a booking/.test(err.message)) continue; // sold out again
        if (err instanceof HttpError) await WaitlistRepository.markLeft(entry._id); // booked another way, or sales ended
        else console.error("waitlist promotion failed", err);
      }
    }
  }

  // Host cancels the whole event: sales stop first, then everyone is refunded in full (fees included)
  // removed: an admin took the event down after reports (guests are told so, rather than "the host cancelled")
  async cancelEvent(eventId: string, user: AuthUser, opts: { removed?: boolean } = {}): Promise<IEvent> {
    const event = await EventService.getOwnedEvent(eventId, user);
    if (event.status === "cancelled") throw new HttpError(409, "This event is already cancelled");
    if (event.date <= new Date()) throw new HttpError(400, "This event has already started");
    const cancelled = await EventRepository.setStatus(eventId, "cancelled"); // no new bookings or approvals from here on
    const [active, holders, waiting] = await Promise.all([
      BookingRepository.find({ eventId, status: { $in: ACTIVE_STATUSES } }),
      TicketRepository.holderIds(eventId),
      WaitlistRepository.waiting(eventId),
    ]);
    for (const b of active) {
      await this.cancelAtomically(String(b._id), (fresh) => (fresh.status === "confirmed" ? fresh.pricing.total : 0)).catch((err) =>
        console.error("cancel booking failed", b._id, err)
      );
    }
    await TicketRepository.voidByEvent(eventId);
    await Promise.all(waiting.map((w) => WaitlistRepository.markLeft(w._id)));
    await NotificationService.notify([...holders, ...active.map((b) => b.userId), ...waiting.map((w) => w.userId)], {
      kind: "event_cancelled",
      title: `${event.title} has been cancelled`,
      body: opts.removed
        ? "EventHive removed this event after reviewing reports. Anything you paid is being refunded in full."
        : "The host cancelled this event. Anything you paid is being refunded in full.",
      link: "/bookings",
    });
    return cancelled!;
  }

  // The buyer's orders, each with its tickets (including ones they've since sent to friends)
  async getUserBookings(userId: string) {
    const bookings = await BookingRepository.findByUser(userId);
    return this.withTickets(bookings);
  }

  // For the invoice page: the buyer, the event's host, or an admin
  async getBooking(id: string, user: AuthUser) {
    const booking = await BookingRepository.findById(id);
    if (!booking) throw new HttpError(404, "Booking not found");
    const event = booking.eventId as unknown as { organizerId?: unknown } | null;
    const allowed = idOf(booking.userId) === user.id || user.role === "admin" || (event && idOf(event.organizerId) === user.id);
    if (!allowed) throw new HttpError(403, "This booking is not yours");
    const [withTickets] = await this.withTickets([booking]);
    return withTickets;
  }

  // Attendee names/emails are only visible to the event's own organizer (or an admin)
  async getEventBookings(eventId: string, user: AuthUser) {
    await EventService.getOwnedEvent(eventId, user);
    return this.withTickets(await BookingRepository.findByEvent(eventId));
  }

  private async withTickets(bookings: IBooking[]) {
    const tickets = await TicketRepository.findByBookings(bookings.map((b) => b._id));
    return bookings.map((b) => ({ ...b.toObject(), tickets: tickets.filter((t) => String(t.bookingId) === String(b._id)) }));
  }
}

export default new BookingService();
