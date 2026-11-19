import { Types } from "mongoose";
import TicketRepository from "../repositories/TicketRepository";
import EventRepository from "../repositories/EventRepository";
import UserRepository from "../repositories/UserRepository";
import NotificationService from "./NotificationService";
import DoorService from "./DoorService";
import { IBooking } from "../models/Booking";
import { ITicket } from "../models/Ticket";
import { newRef, newSecret, parseDoorCode, verifyCode } from "../domain/totp";
import { idOf } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";
import { AuthUser } from "../middleware/auth";

const TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
const alreadyIn = (at: Date) =>
  `Already checked in at ${at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE })}`;

// What the door desk sees after a scan (door helpers too, so no contact details)
const admitted = (t: ITicket) => ({
  _id: t._id,
  holderName: t.holderName,
  tierName: t.tierName,
  ref: t.ref,
  checkedInAt: t.checkedInAt,
});

class TicketService {
  // One ticket per admission. Blank names default to the buyer ("Ananya", "Ananya's guest").
  async issue(booking: IBooking, buyerName: string): Promise<ITicket[]> {
    const names = Array.from({ length: booking.quantity }, (_, i) =>
      booking.holderNames?.[i]?.trim() || (i === 0 ? buyerName : `${buyerName}'s guest`)
    );
    // ponytail: a 6-letter ref collision (1 in ~190M per event) would fail this insert; retry if it ever matters
    return TicketRepository.createMany(
      names.map((holderName) => ({
        bookingId: booking._id,
        eventId: booking.eventId,
        ownerId: booking.userId,
        holderName,
        tierName: booking.tierName,
        ref: newRef(),
        secret: newSecret(),
      }))
    );
  }

  // A void ticket is only a record: it keeps no secret, address or join link (they may change later)
  async myTickets(userId: string) {
    const tickets = await TicketRepository.findOwned(userId);
    return tickets.map((t) => {
      const obj = t.toObject() as Record<string, unknown> & { eventId?: Record<string, unknown> | null };
      if (t.status !== "valid") {
        delete obj.secret;
        if (obj.eventId) {
          delete obj.eventId.address;
          delete obj.eventId.meetingLink;
        }
      }
      return obj;
    });
  }

  // Gives a ticket to another EventHive user. The reference and secret change, so the
  // sender's copy (or a screenshot of it) stops working immediately.
  async transfer(ticketId: string, userId: string, email: string): Promise<ITicket> {
    const ticket = await TicketRepository.findById(ticketId);
    if (!ticket) throw new HttpError(404, "Ticket not found");
    if (idOf(ticket.ownerId) !== userId) throw new HttpError(403, "This ticket is not yours");
    if (ticket.status !== "valid") throw new HttpError(409, "This ticket was cancelled");
    if (ticket.checkedInAt) throw new HttpError(409, "This ticket has already been used");
    const event = await EventRepository.findById(idOf(ticket.eventId));
    if (!event || event.status === "cancelled") throw new HttpError(409, "This event was cancelled");
    if (event.date <= new Date()) throw new HttpError(400, "Tickets can't be transferred once the event has started");

    const recipient = await UserRepository.findByEmail(email);
    if (!recipient) throw new HttpError(404, "No EventHive account uses that email. Ask your friend to sign up first.");
    if (String(recipient._id) === userId) throw new HttpError(400, "That's your own account");
    if (String(recipient._id) === idOf(event.organizerId)) throw new HttpError(400, "The host doesn't need a ticket to their own event");

    const moved = await TicketRepository.transfer(ticketId, userId, {
      ownerId: recipient._id as Types.ObjectId,
      holderName: recipient.name,
      ref: newRef(),
      secret: newSecret(),
      transferredAt: new Date(),
    });
    if (!moved) throw new HttpError(409, "This ticket just changed. Reload and try again.");
    const sender = await UserRepository.findPublic(userId);
    await NotificationService.notify([recipient._id as Types.ObjectId], {
      kind: "ticket_received",
      title: `${sender?.name ?? "A friend"} sent you a ticket`,
      body: `${moved.tierName} for ${event.title}. It's in My Tickets.`,
      link: "/bookings",
    });
    return moved;
  }

  // Door check-in: the scanned QR (or typed door code) must carry a code that is valid right now
  async checkIn(eventId: string, input: string, user: AuthUser) {
    await DoorService.getDoorEvent(eventId, user);
    const parsed = parseDoorCode(input);
    if (!parsed) throw new HttpError(400, "That isn't an EventHive ticket code");
    const ticket = await TicketRepository.findByEventRef(eventId, parsed.ref);
    if (!ticket) throw new HttpError(404, "No ticket with that reference for this event");
    if (ticket.status !== "valid") throw new HttpError(409, "This ticket was cancelled");
    if (ticket.checkedInAt) throw new HttpError(409, alreadyIn(ticket.checkedInAt));
    if (!verifyCode(ticket.secret, parsed.code)) {
      throw new HttpError(409, "This code has expired. Ask the guest to open their live ticket (screenshots don't work).");
    }
    return this.admit(ticket);
  }

  // Manual admit from the guest list, after the host has checked the person in front of them
  async admitById(ticketId: string, user: AuthUser) {
    const ticket = await TicketRepository.findById(ticketId);
    if (!ticket) throw new HttpError(404, "Ticket not found");
    await DoorService.getDoorEvent(idOf(ticket.eventId), user);
    if (ticket.status !== "valid") throw new HttpError(409, "This ticket was cancelled");
    if (ticket.checkedInAt) throw new HttpError(409, alreadyIn(ticket.checkedInAt));
    return this.admit(ticket);
  }

  private async admit(ticket: ITicket) {
    const done = await TicketRepository.markCheckedIn(String(ticket._id));
    if (!done) throw new HttpError(409, "This ticket was just checked in");
    return admitted(done);
  }
}

export default new TicketService();
