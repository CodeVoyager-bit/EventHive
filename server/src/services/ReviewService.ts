import { Types } from "mongoose";
import ReviewRepository from "../repositories/ReviewRepository";
import TicketRepository from "../repositories/TicketRepository";
import UserRepository from "../repositories/UserRepository";
import EventService from "./EventService";
import NotificationService from "./NotificationService";
import { IReview } from "../models/Review";
import { idOf } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";
import { AuthUser } from "../middleware/auth";

class ReviewService {
  // Anyone who held a ticket (including one a friend sent them) can review once the event ends
  async createReview(userId: string, eventId: string, rating: number, comment: string): Promise<IReview> {
    const event = await EventService.getEventById(eventId);
    if (event.date > new Date()) throw new HttpError(400, "You can review an event once it has ended");
    if (idOf(event.organizerId) === userId) throw new HttpError(403, "Hosts can reply to reviews, not write them");
    if (!(await TicketRepository.holds(userId, eventId))) {
      throw new HttpError(403, "Only attendees can review this event");
    }
    let review: IReview;
    try {
      review = await ReviewRepository.create({
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
    const author = await UserRepository.findPublic(userId);
    await NotificationService.notify([event.organizerId], {
      kind: "new_review",
      title: `${author?.name ?? "A guest"} rated ${event.title} ${rating}/5`,
      body: comment.length > 140 ? `${comment.slice(0, 137)}...` : comment,
      link: `/events/${eventId}#reviews`,
    });
    return review;
  }

  // The host answers a review in public (Meetup-style)
  async reply(reviewId: string, user: AuthUser, body: string): Promise<IReview> {
    const review = await ReviewRepository.findById(reviewId);
    if (!review) throw new HttpError(404, "Review not found");
    const event = await EventService.getOwnedEvent(idOf(review.eventId), user);
    const updated = await ReviewRepository.setReply(reviewId, body);
    await NotificationService.notify([review.userId], {
      kind: "review_reply",
      title: `The host replied to your review of ${event.title}`,
      body: body.length > 140 ? `${body.slice(0, 137)}...` : body,
      link: `/events/${event._id}#reviews`,
    });
    return updated!;
  }

  async getRecent(limit: number): Promise<IReview[]> {
    return ReviewRepository.findRecent(limit);
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
