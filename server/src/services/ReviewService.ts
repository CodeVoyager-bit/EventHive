import ReviewRepository from "../repositories/ReviewRepository";
import { IReview } from "../models/Review";

class ReviewService {
  async createReview(data: Partial<IReview>): Promise<IReview> {
    return ReviewRepository.create(data);
  }

  async getEventReviews(eventId: string): Promise<IReview[]> {
    return ReviewRepository.findByEvent(eventId);
  }

  async getAverageRating(eventId: string): Promise<number> {
    return ReviewRepository.getAverageRating(eventId);
  }
}

export default new ReviewService();
