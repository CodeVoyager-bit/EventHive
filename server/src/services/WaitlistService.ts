import { Types } from "mongoose";
import WaitlistRepository from "../repositories/WaitlistRepository";
import BookingRepository from "../repositories/BookingRepository";
import EventService from "./EventService";
import { IWaitlist } from "../models/Waitlist";
import { idOf } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";
import { AuthUser } from "../middleware/auth";

// Joining and leaving the line. Promotion (booking people in when seats free up) lives in
// BookingService.promoteWaitlist, because it is a booking.
class WaitlistService {
  async join(userId: string, eventId: string, input: { tierId?: string; quantity: number }) {
    const event = await EventService.getEventById(eventId);
    if (event.status !== "published" || event.date <= new Date()) throw new HttpError(400, "This event isn't taking bookings");
    if (idOf(event.organizerId) === userId) throw new HttpError(400, "You can't join your own waitlist");
    const tier = input.tierId ? event.tiers.id(input.tierId) : event.tiers[0];
    if (!tier) throw new HttpError(404, "Ticket tier not found");
    if (input.quantity > tier.maxPerOrder) throw new HttpError(400, `You can wait for up to ${tier.maxPerOrder} tickets`);
    if (tier.remaining >= input.quantity) throw new HttpError(409, `${tier.name} still has tickets. Book them now.`);
    if (await BookingRepository.hasActive(userId, eventId)) throw new HttpError(409, "You already have a booking for this event");
    try {
      await WaitlistRepository.create({
        eventId: event._id,
        userId: new Types.ObjectId(userId),
        tierId: tier._id,
        quantity: input.quantity,
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new HttpError(409, "You're already on the waitlist");
      throw err;
    }
    return this.position(userId, eventId);
  }

  async leave(userId: string, eventId: string): Promise<void> {
    if (!(await WaitlistRepository.leave(eventId, userId))) throw new HttpError(404, "You're not on this waitlist");
  }

  async position(userId: string, eventId: string) {
    const found = await WaitlistRepository.positionOf(eventId, userId);
    return found ? { position: found.position, quantity: found.entry.quantity, tierId: found.entry.tierId } : null;
  }

  async mine(userId: string): Promise<IWaitlist[]> {
    return WaitlistRepository.findByUser(userId);
  }

  async forEvent(eventId: string, user: AuthUser): Promise<IWaitlist[]> {
    await EventService.getOwnedEvent(eventId, user);
    return WaitlistRepository.waitingWithUsers(eventId);
  }
}

export default new WaitlistService();
