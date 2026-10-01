import crypto from "crypto";
import { Types } from "mongoose";
import BookingRepository from "../repositories/BookingRepository";
import EventRepository from "../repositories/EventRepository";
import EventService from "./EventService";
import { TicketFactory } from "../models/Ticket";
import { MockStripeGateway, IPaymentGateway } from "../interfaces/IPaymentGateway";
import { IBooking } from "../models/Booking";
import { IEvent } from "../models/Event";
import { idOf } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";
import { AuthUser } from "../middleware/auth";

class BookingService {
  private paymentGateway: IPaymentGateway;

  constructor() {
    // Abstraction: payment gateway can be swapped without changing booking logic
    this.paymentGateway = new MockStripeGateway();
  }

  async createBooking(
    userId: string,
    eventId: string,
    ticketType: "general" | "vip"
  ): Promise<IBooking> {
    const event = await EventService.getEventById(eventId);
    if (event.status !== "published") throw new HttpError(400, "Event is not available");
    if (event.date <= new Date()) throw new HttpError(400, "This event has already started");
    if (await BookingRepository.hasConfirmed(userId, eventId)) {
      throw new HttpError(409, "You already have a ticket for this event");
    }

    // Concurrency-safe: atomic increment only while seats remain
    const seat = await EventRepository.decrementAvailableTickets(eventId);
    if (!seat) throw new HttpError(409, "Tickets are sold out");

    try {
      // Factory Pattern: create ticket based on type
      const ticket = TicketFactory.createTicket(ticketType, event.price);

      // Process payment via abstracted gateway
      const payment = await this.paymentGateway.processPayment(ticket.price, userId);
      if (!payment.success) throw new HttpError(402, "Payment failed");

      return await BookingRepository.create({
        userId: new Types.ObjectId(userId),
        eventId: new Types.ObjectId(eventId),
        ticketType,
        ticketCode: crypto.randomBytes(8).toString("hex").toUpperCase(),
        amount: ticket.price,
        status: "confirmed",
        transactionId: payment.transactionId,
      });
    } catch (err) {
      await EventRepository.incrementAvailableTickets(eventId); // give the seat back
      if ((err as { code?: number }).code === 11000) {
        throw new HttpError(409, "You already have a ticket for this event"); // lost a race with a parallel request
      }
      throw err;
    }
  }

  async getUserBookings(userId: string): Promise<IBooking[]> {
    return BookingRepository.findByUser(userId);
  }

  // Attendee names/emails are only visible to the event's own organizer (or an admin)
  async getEventBookings(eventId: string, user: AuthUser): Promise<IBooking[]> {
    await EventService.getOwnedEvent(eventId, user);
    return BookingRepository.findByEvent(eventId);
  }

  async cancelBooking(bookingId: string, userId: string): Promise<IBooking | null> {
    const booking = await BookingRepository.findById(bookingId);
    if (!booking) throw new HttpError(404, "Booking not found");
    if (idOf(booking.userId) !== userId) throw new HttpError(403, "This booking is not yours");
    if (booking.status === "cancelled") throw new HttpError(400, "Booking is already cancelled");

    // eventId is populated by the repository; it is null if the event was deleted
    const event = booking.eventId as unknown as Pick<IEvent, "_id" | "date"> | null;
    if (event && event.date <= new Date()) {
      throw new HttpError(400, "Bookings cannot be cancelled once the event has started");
    }

    if (booking.transactionId) await this.paymentGateway.refundPayment(booking.transactionId);
    if (event) await EventRepository.incrementAvailableTickets(idOf(event)); // restore the seat
    return BookingRepository.update(bookingId, { status: "cancelled" });
  }
}

export default new BookingService();
