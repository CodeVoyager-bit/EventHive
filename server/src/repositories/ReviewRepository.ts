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

  async findByUser(userId: string): Promise<IReview[]> {
    return Review.find({ userId }).populate("eventId", "title");
  }

  async getAverageRating(eventId: string): Promise<number> {
    const result = await Review.aggregate([
      { $match: { eventId: eventId } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    return result.length > 0 ? Math.round(result[0].avgRating * 10) / 10 : 0;
  }
}

export default new ReviewRepository();
