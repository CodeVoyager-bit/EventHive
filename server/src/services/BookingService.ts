import BookingRepository from "../repositories/BookingRepository";
import EventRepository from "../repositories/EventRepository";
import { TicketFactory } from "../models/Ticket";
import { MockStripeGateway, IPaymentGateway } from "../interfaces/IPaymentGateway";
import { IBooking } from "../models/Booking";
import crypto from "crypto";
import { idOf } from "../lib/idOf";

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
    const event = await EventRepository.findById(eventId);
    if (!event) throw new Error("Event not found");
    if (event.status !== "published") throw new Error("Event is not available");

    // Concurrency-safe: atomic decrement only if tickets available
    const updated = await EventRepository.decrementAvailableTickets(eventId);
    if (!updated) throw new Error("Tickets are sold out");

    // Factory Pattern: create ticket based on type
    const ticket = TicketFactory.createTicket(ticketType, event.price);

    // Process payment via abstracted gateway
    const paymentResult = await this.paymentGateway.processPayment(
      ticket.price,
      userId
    );

    if (!paymentResult.success) {
      throw new Error("Payment failed");
    }

    const ticketCode = crypto.randomBytes(8).toString("hex").toUpperCase();

    const booking = await BookingRepository.create({
      userId: userId as any,
      eventId: eventId as any,
      ticketType,
      ticketCode,
      amount: ticket.price,
      status: "confirmed",
    });

    return booking;
  }

  async getUserBookings(userId: string): Promise<IBooking[]> {
    return BookingRepository.findByUser(userId);
  }

  async getEventBookings(
    eventId: string,
    requester: { id: string; role: string }
  ): Promise<IBooking[]> {
    const event = await EventRepository.findById(eventId);
    if (!event) throw new Error("Event not found");
    // Attendee names/emails are only visible to the event's own organizer (or an admin)
    if (requester.role !== "admin" && idOf(event.organizerId) !== requester.id) {
      throw new Error("Unauthorized: You can only view attendees of your own events");
    }
    return BookingRepository.findByEvent(eventId);
  }

  async cancelBooking(bookingId: string, userId: string): Promise<IBooking | null> {
    const booking = await BookingRepository.findById(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.status === "cancelled") throw new Error("Booking is already cancelled");

    // userId/eventId are populated by the repository; idOf() handles doc or raw id
    if (idOf(booking.userId) !== userId) {
      throw new Error("Unauthorized");
    }

    // Restore the ticket slot on the event
    await EventRepository.incrementAvailableTickets(idOf(booking.eventId));

    return BookingRepository.update(bookingId, { status: "cancelled" });
  }
}

export default new BookingService();
