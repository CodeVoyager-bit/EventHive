import mongoose from "mongoose";
import Review, { IReview } from "../models/Review";

class ReviewRepository {
  async create(data: Partial<IReview>): Promise<IReview> {
    const review = new Review(data);
    return review.save();
  }

  async findByEvent(eventId: string): Promise<IReview[]> {
    return Review.find({ eventId })
      .populate("userId", "name")
      .sort({ createdAt: -1 });
  }

  // Newest reviews whose event and author still exist (deleted events leave orphaned reviews)
  async findRecent(limit: number): Promise<IReview[]> {
    const rows = await Review.find()
      .sort({ createdAt: -1 })
      .limit(limit * 3)
      .populate("userId", "name")
      .populate("eventId", "title category");
    return rows.filter((r) => r.eventId && r.userId).slice(0, limit);
  }

  async countByUser(userId: string): Promise<number> {
    return Review.countDocuments({ userId });
  }

  async findById(id: string): Promise<IReview | null> {
    return Review.findById(id);
  }

  async setReply(id: string, body: string): Promise<IReview | null> {
    return Review.findByIdAndUpdate(id, { $set: { reply: { body, createdAt: new Date() } } }, { new: true });
  }

  // A host's reviews across all their events (for the host profile)
  async findByEvents(eventIds: mongoose.Types.ObjectId[], limit: number): Promise<IReview[]> {
    return Review.find({ eventId: { $in: eventIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name")
      .populate("eventId", "title category");
  }

  async statsForEvents(eventIds: mongoose.Types.ObjectId[]): Promise<{ averageRating: number; reviewCount: number }> {
    const [row] = await Review.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    return { averageRating: row ? Math.round(row.avg * 10) / 10 : 0, reviewCount: row?.count ?? 0 };
  }

  async getStats(eventId: string): Promise<{ averageRating: number; reviewCount: number }> {
    const [row] = await Review.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    return {
      averageRating: row ? Math.round(row.avg * 10) / 10 : 0,
      reviewCount: row?.count ?? 0,
    };
  }
}

export default new ReviewRepository();
