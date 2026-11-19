import { Types } from "mongoose";
import Notification, { INotification } from "../models/Notification";

class NotificationRepository {
  async insertMany(rows: Partial<INotification>[]): Promise<void> {
    if (rows.length) await Notification.insertMany(rows, { ordered: false });
  }

  // Creates the row once; later calls with the same key do nothing (used for reminders)
  async upsertOnce(dedupeKey: string, row: Partial<INotification>): Promise<void> {
    await Notification.updateOne({ dedupeKey }, { $setOnInsert: { ...row, dedupeKey } }, { upsert: true });
  }

  async list(userId: string, limit: number): Promise<INotification[]> {
    return Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  }

  async unreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, readAt: { $exists: false } });
  }

  async markRead(userId: string, id?: string): Promise<void> {
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId), readAt: { $exists: false } };
    if (id) filter._id = new Types.ObjectId(id);
    await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  }
}

export default new NotificationRepository();
