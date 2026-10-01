import { Types } from "mongoose";
import ReviewRepository from "../repositories/ReviewRepository";
import BookingRepository from "../repositories/BookingRepository";
import EventService from "./EventService";
import { IReview } from "../models/Review";
import { HttpError } from "../middleware/errorHandler";

class ReviewService {
  async createReview(userId: string, eventId: string, rating: number, comment: string): Promise<IReview> {
    const event = await EventService.getEventById(eventId);
    if (event.date > new Date()) throw new HttpError(400, "You can review an event once it has ended");
    if (!(await BookingRepository.hasConfirmed(userId, eventId))) {
      throw new HttpError(403, "Only attendees can review this event");
    }
    try {
      return await ReviewRepository.create({
        userId: new Types.ObjectId(userId),
        eventId: new Types.ObjectId(eventId),
        rating,
        comment,
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new HttpError(409, "You have already reviewed this event");
      }
      throw err;
    }
  }

  async getEventReviews(
    eventId: string
  ): Promise<{ reviews: IReview[]; averageRating: number; reviewCount: number }> {
    const [reviews, stats] = await Promise.all([
      ReviewRepository.findByEvent(eventId),
      ReviewRepository.getStats(eventId),
    ]);
    return { reviews, ...stats };
  }
}

export default new ReviewService();
