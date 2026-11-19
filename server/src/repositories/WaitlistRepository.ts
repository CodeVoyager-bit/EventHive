import { Types } from "mongoose";
import Waitlist, { IWaitlist } from "../models/Waitlist";

class WaitlistRepository {
  async create(data: Partial<IWaitlist>): Promise<IWaitlist> {
    return new Waitlist(data).save();
  }

  async leave(eventId: string, userId: string): Promise<boolean> {
    const res = await Waitlist.updateOne({ eventId, userId, status: "waiting" }, { $set: { status: "left" } });
    return res.modifiedCount === 1;
  }

  // Oldest first: the line is first come, first served
  async waiting(eventId: string): Promise<IWaitlist[]> {
    return Waitlist.find({ eventId, status: "waiting" }).sort({ createdAt: 1, _id: 1 });
  }

  async waitingWithUsers(eventId: string): Promise<IWaitlist[]> {
    return Waitlist.find({ eventId, status: "waiting" }).populate("userId", "name email").sort({ createdAt: 1, _id: 1 });
  }

  async markPromoted(id: Types.ObjectId, bookingId: Types.ObjectId): Promise<void> {
    await Waitlist.updateOne({ _id: id, status: "waiting" }, { $set: { status: "promoted", bookingId } });
  }

  async markLeft(id: Types.ObjectId): Promise<void> {
    await Waitlist.updateOne({ _id: id, status: "waiting" }, { $set: { status: "left" } });
  }

  async countWaiting(eventId: string): Promise<number> {
    return Waitlist.countDocuments({ eventId, status: "waiting" });
  }

  async positionOf(eventId: string, userId: string): Promise<{ position: number; entry: IWaitlist } | null> {
    const entry = await Waitlist.findOne({ eventId, userId, status: "waiting" });
    if (!entry) return null;
    const ahead = await Waitlist.countDocuments({ eventId, status: "waiting", createdAt: { $lt: entry.createdAt } });
    return { position: ahead + 1, entry };
  }

  async findByUser(userId: string): Promise<IWaitlist[]> {
    return Waitlist.find({ userId, status: "waiting" })
      .populate("eventId", "title date location imageUrl category tiers")
      .sort({ createdAt: -1 });
  }
}

export default new WaitlistRepository();
