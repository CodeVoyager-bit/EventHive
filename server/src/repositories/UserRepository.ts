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
    return User.findByIdAndUpdate(id, data, { new: true }).select("-password");
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

  async getSavedIds(userId: string): Promise<string[]> {
    const user = await User.findById(userId).select("saved").lean();
    return (user?.saved ?? []).map(String);
  }

  async getSavedEvents(userId: string): Promise<IEvent[]> {
    const user = await User.findById(userId)
      .select("saved")
      .populate<{ saved: IEvent[] }>({ path: "saved", options: { sort: { date: 1 } } });
    // populate drops ids whose event was deleted
    return (user?.saved ?? []).filter(Boolean);
  }
}

export default new UserRepository();
