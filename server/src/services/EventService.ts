import EventRepository from "../repositories/EventRepository";
import BookingRepository from "../repositories/BookingRepository";
import { IEvent } from "../models/Event";

class EventService {
  async createEvent(data: Partial<IEvent>): Promise<IEvent> {
    return EventRepository.create(data);
  }

  async getEventById(id: string): Promise<IEvent | null> {
    return EventRepository.findById(id);
  }

  async getAllEvents(filters: Record<string, unknown> = {}): Promise<IEvent[]> {
    const query: Record<string, unknown> = { status: "published" };
    if (filters.category) query.category = filters.category;
    if (filters.eventType) query.eventType = filters.eventType;
    return EventRepository.findAll(query);
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

  async searchEvents(query: string): Promise<IEvent[]> {
    return EventRepository.search(query);
  }

  async updateEvent(
    id: string,
    organizerId: string,
    data: Partial<IEvent>
  ): Promise<IEvent | null> {
    const event = await EventRepository.findById(id);
    if (!event) throw new Error("Event not found");
    const rawOrg = event.organizerId as any;
    const eventOrgId: string = rawOrg?._id ? rawOrg._id.toString() : rawOrg?.toString() ?? "";
    if (eventOrgId !== organizerId) {
      throw new Error("Unauthorized: You can only edit your own events");
    }
    return EventRepository.update(id, data);
  }

  async deleteEvent(id: string, organizerId: string): Promise<IEvent | null> {
    const event = await EventRepository.findById(id);
    if (!event) throw new Error("Event not found");
    const rawOrg = event.organizerId as any;
    const eventOrgId: string = rawOrg?._id ? rawOrg._id.toString() : rawOrg?.toString() ?? "";
    if (eventOrgId !== organizerId) {
      throw new Error("Unauthorized: You can only delete your own events");
    }
    return EventRepository.delete(id);
  }
}

export default new EventService();
