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
