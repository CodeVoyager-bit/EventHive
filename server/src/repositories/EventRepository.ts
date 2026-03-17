import Event, { IEvent } from "../models/Event";

class EventRepository {
  async create(data: Partial<IEvent>): Promise<IEvent> {
    const event = new Event(data);
    return event.save();
  }

  async findById(id: string): Promise<IEvent | null> {
    return Event.findById(id).populate("organizerId", "name email");
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<IEvent[]> {
    return Event.find(filters)
      .populate("organizerId", "name email")
      .sort({ date: 1 });
  }

  async findByOrganizer(organizerId: string): Promise<IEvent[]> {
    return Event.find({ organizerId }).sort({ createdAt: -1 });
  }

  async search(query: string): Promise<IEvent[]> {
    return Event.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
      ],
      status: "published",
    }).populate("organizerId", "name email");
  }

  async update(id: string, data: Partial<IEvent>): Promise<IEvent | null> {
    return Event.findByIdAndUpdate(id, data, { new: true });
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
}

export default new EventRepository();
