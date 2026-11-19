import { Types } from "mongoose";
import Ticket, { ITicket } from "../models/Ticket";

const EVENT_FIELDS = "title date location address eventType meetingLink platform imageUrl category status secretLocation refundPolicy organizerId";

class TicketRepository {
  async createMany(tickets: Partial<ITicket>[]): Promise<ITicket[]> {
    return Ticket.insertMany(tickets) as unknown as Promise<ITicket[]>;
  }

  // The owner's tickets, with the secret their device needs to draw the rotating QR
  async findOwned(ownerId: string): Promise<ITicket[]> {
    return Ticket.find({ ownerId })
      .select("+secret")
      .populate("eventId", EVENT_FIELDS)
      .sort({ createdAt: -1 });
  }

  async findById(id: string, withSecret = false): Promise<ITicket | null> {
    const q = Ticket.findById(id);
    return withSecret ? q.select("+secret") : q;
  }

  async findByEventRef(eventId: string, ref: string): Promise<ITicket | null> {
    return Ticket.findOne({ eventId, ref }).select("+secret").populate("ownerId", "name email");
  }

  async findByBooking(bookingId: string | Types.ObjectId): Promise<ITicket[]> {
    return Ticket.find({ bookingId }).populate("ownerId", "name email");
  }

  async findByBookings(bookingIds: Types.ObjectId[]): Promise<ITicket[]> {
    return Ticket.find({ bookingId: { $in: bookingIds } }).populate("ownerId", "name email").sort({ createdAt: 1 });
  }

  async findByEvent(eventId: string): Promise<ITicket[]> {
    return Ticket.find({ eventId }).populate("ownerId", "name email").sort({ createdAt: 1 });
  }

  // Atomic: only the first check-in wins, so a double scan cannot admit twice
  async markCheckedIn(id: string): Promise<ITicket | null> {
    return Ticket.findOneAndUpdate(
      { _id: id, status: "valid", checkedInAt: { $exists: false } },
      { $set: { checkedInAt: new Date() } },
      { new: true }
    ).populate("ownerId", "name email");
  }

  // Moves a ticket to a new owner with a fresh reference and secret (the old QR stops working)
  async transfer(id: string, fromOwner: string, set: Partial<ITicket>): Promise<ITicket | null> {
    return Ticket.findOneAndUpdate(
      { _id: id, ownerId: fromOwner, status: "valid", checkedInAt: { $exists: false } },
      { $set: set },
      { new: true }
    );
  }

  async voidByBooking(bookingId: string | Types.ObjectId): Promise<void> {
    await Ticket.updateMany({ bookingId, status: "valid" }, { $set: { status: "void" } });
  }

  async voidByEvent(eventId: string): Promise<void> {
    await Ticket.updateMany({ eventId, status: "valid" }, { $set: { status: "void" } });
  }

  async holderIds(eventId: string): Promise<Types.ObjectId[]> {
    return Ticket.distinct("ownerId", { eventId, status: "valid" });
  }

  async holds(userId: string, eventId: string): Promise<boolean> {
    return !!(await Ticket.exists({ ownerId: userId, eventId, status: "valid" }));
  }

  async anyCheckedIn(bookingId: string | Types.ObjectId): Promise<boolean> {
    return !!(await Ticket.exists({ bookingId, checkedInAt: { $exists: true } }));
  }

  async anyTransferred(bookingId: string | Types.ObjectId): Promise<boolean> {
    return !!(await Ticket.exists({ bookingId, transferredAt: { $exists: true } }));
  }

  async checkInCounts(eventId: string): Promise<{ total: number; checkedIn: number }> {
    const [total, checkedIn] = await Promise.all([
      Ticket.countDocuments({ eventId, status: "valid" }),
      Ticket.countDocuments({ eventId, status: "valid", checkedInAt: { $exists: true } }),
    ]);
    return { total, checkedIn };
  }

  // Names of distinct ticket holders, earliest first, for "who's going" (never emails)
  async guestNames(eventId: string, limit: number): Promise<string[]> {
    const rows = await Ticket.aggregate<{ name: string }>([
      { $match: { eventId: new Types.ObjectId(eventId), status: "valid" } },
      { $group: { _id: "$ownerId", first: { $min: "$createdAt" } } },
      { $sort: { first: 1, _id: 1 } },
      { $limit: limit },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $project: { _id: 0, name: { $first: "$user.name" } } },
    ]);
    return rows.map((r) => r.name).filter(Boolean);
  }

  async countValid(eventId: string): Promise<number> {
    return Ticket.countDocuments({ eventId, status: "valid" });
  }
}

export default new TicketRepository();
