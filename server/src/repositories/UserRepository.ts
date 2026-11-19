import crypto from "crypto";
import { FilterQuery, Types } from "mongoose";
import User, { IUser } from "../models/User";
import { IEvent } from "../models/Event";

class UserRepository {
  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User(data);
    return user.save();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).select("-password");
  }

  async findAll(): Promise<IUser[]> {
    return User.find().select("-password");
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).select("-password -saved -following");
  }

  async findPublic(id: string): Promise<IUser | null> {
    return User.findById(id).select("name role bio city verified createdAt");
  }

  async find(filter: FilterQuery<IUser>, limit = 50): Promise<IUser[]> {
    return User.find(filter).select("name email role bio city verified createdAt").sort({ createdAt: 1 }).limit(limit);
  }

  async countByRole(): Promise<Record<string, number>> {
    const rows: { _id: string; n: number }[] = await User.aggregate([{ $group: { _id: "$role", n: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((r) => [r._id, r.n]));
  }

  async follow(userId: string, hostId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $addToSet: { following: hostId } });
  }

  async unfollow(userId: string, hostId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $pull: { following: hostId } });
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const user = await User.findById(userId).select("following").lean();
    return (user?.following ?? []).map(String);
  }

  async followerIds(hostId: string | Types.ObjectId): Promise<Types.ObjectId[]> {
    return (await User.find({ following: hostId }).select("_id").lean()).map((u) => u._id);
  }

  async followerCount(hostId: string | Types.ObjectId): Promise<number> {
    return User.countDocuments({ following: hostId });
  }

  async interestedCount(eventId: string): Promise<number> {
    return User.countDocuments({ saved: eventId });
  }

  async delete(id: string): Promise<IUser | null> {
    return User.findByIdAndDelete(id);
  }

  async addSaved(userId: string, eventId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $addToSet: { saved: eventId } });
  }

  async removeSaved(userId: string, eventId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $pull: { saved: eventId } });
  }

  // The secret in someone's calendar feed URL; made on first use, replaced on reset (old links stop working)
  async calendarToken(userId: string, reset = false): Promise<string> {
    if (!reset) {
      const user = await User.findById(userId).select("+calendarToken");
      if (user?.calendarToken) return user.calendarToken;
    }
    const token = crypto.randomBytes(18).toString("base64url");
    await User.updateOne({ _id: userId }, { $set: { calendarToken: token } });
    return token;
  }

  async findByCalendarToken(token: string): Promise<IUser | null> {
    return User.findOne({ calendarToken: token });
  }

  async getSavedIds(userId: string): Promise<string[]> {
    const user = await User.findById(userId).select("saved").lean();
    return (user?.saved ?? []).map(String);
  }

  async getSavedEvents(userId: string): Promise<IEvent[]> {
    const user = await User.findById(userId)
      .select("saved")
      .populate<{ saved: IEvent[] }>({
        path: "saved",
        select: "-address -mapLocation -meetingLink",
        match: { status: { $ne: "draft" } },
        options: { sort: { date: 1 } },
        populate: { path: "organizerId", select: "name verified" },
      });
    // populate drops ids whose event was deleted
    return (user?.saved ?? []).filter(Boolean);
  }
}

export default new UserRepository();
