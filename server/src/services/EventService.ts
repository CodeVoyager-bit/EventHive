import { FilterQuery, Types } from "mongoose";
import EventRepository from "../repositories/EventRepository";
import BookingRepository from "../repositories/BookingRepository";
import { IEvent } from "../models/Event";
import { idOf, escapeRegex } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";
import { AuthUser } from "../middleware/auth";
import { CreateEventInput, UpdateEventInput, ListEventsQuery } from "../schemas";

class EventService {
  async createEvent(data: CreateEventInput, organizerId: string): Promise<IEvent> {
    return EventRepository.create({ ...data, organizerId: new Types.ObjectId(organizerId) });
  }

  async getEventById(id: string): Promise<IEvent> {
    const event = await EventRepository.findById(id);
    if (!event) throw new HttpError(404, "Event not found");
    return event;
  }

  // Loads an event and checks the requester may manage it (its organizer, or an admin)
  async getOwnedEvent(id: string, user: AuthUser): Promise<IEvent> {
    const event = await this.getEventById(id);
    if (user.role !== "admin" && idOf(event.organizerId) !== user.id) {
      throw new HttpError(403, "You can only manage your own events");
    }
    return event;
  }

  async listEvents(q: ListEventsQuery): Promise<{ items: IEvent[]; total: number }> {
    const filter: FilterQuery<IEvent> = { status: "published" };
    if (q.category) filter.category = q.category;
    if (q.eventType) filter.eventType = q.eventType;
    // Upcoming by default; an explicit from/to window can reach past events
    const date: Record<string, Date> = {};
    if (q.from) date.$gte = q.from;
    if (q.to) date.$lt = new Date(q.to.getTime() + 86_400_000); // include the whole "to" day
    if (!q.from && !q.to) date.$gte = new Date();
    filter.date = date;
    if (q.q) {
      // ponytail: regex scan over four fields; switch to a text index if the catalogue grows
      const rx = new RegExp(escapeRegex(q.q), "i");
      filter.$or = [{ title: rx }, { description: rx }, { location: rx }, { category: rx }];
    }
    return EventRepository.findPaged(filter, q.page, q.limit);
  }

  async getEventsByOrganizer(organizerId: string): Promise<(IEvent & { revenue: number })[]> {
    const events = await EventRepository.findByOrganizer(organizerId);
    return Promise.all(
      events.map(async (event) => {
        const revenue = await BookingRepository.getRevenueByEvent(event._id.toString());
        return Object.assign(event.toObject(), { revenue }) as IEvent & { revenue: number };
      })
    );
  }

  async updateEvent(id: string, user: AuthUser, data: UpdateEventInput): Promise<IEvent | null> {
    await this.getOwnedEvent(id, user);
    return EventRepository.update(id, data);
  }

  async deleteEvent(id: string, user: AuthUser): Promise<IEvent | null> {
    await this.getOwnedEvent(id, user);
    // Cancel all confirmed bookings before deleting the event
    await BookingRepository.cancelAllByEvent(id);
    return EventRepository.delete(id);
  }
}

export default new EventService();
