import { FilterQuery } from "mongoose";
import Event, { IEvent } from "../models/Event";

class EventRepository {
  async create(data: Partial<IEvent>): Promise<IEvent> {
    const event = new Event(data);
    return event.save();
  }

  async findById(id: string): Promise<IEvent | null> {
    return Event.findById(id).populate("organizerId", "name email");
  }

  async findPaged(
    filter: FilterQuery<IEvent>,
    page: number,
    limit: number
  ): Promise<{ items: IEvent[]; total: number }> {
    const [items, total] = await Promise.all([
      Event.find(filter)
        .populate("organizerId", "name email")
        .sort({ date: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Event.countDocuments(filter),
    ]);
    return { items, total };
  }

  async findByOrganizer(organizerId: string): Promise<IEvent[]> {
    return Event.find({ organizerId }).sort({ createdAt: -1 });
  }

  async update(id: string, data: Partial<IEvent>): Promise<IEvent | null> {
    return Event.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id: string): Promise<IEvent | null> {
    return Event.findByIdAndDelete(id);
  }

  async decrementAvailableTickets(id: string): Promise<IEvent | null> {
    return Event.findOneAndUpdate(
      { _id: id, $expr: { $lt: ["$bookedCount", "$capacity"] } },
      { $inc: { bookedCount: 1 } },
      { new: true }
    );
  }

  async incrementAvailableTickets(id: string): Promise<IEvent | null> {
    return Event.findOneAndUpdate(
      { _id: id, bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 } },
      { new: true }
    );
  }
}

export default new EventRepository();
