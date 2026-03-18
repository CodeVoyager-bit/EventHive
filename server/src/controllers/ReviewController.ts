import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import ReviewService from "../services/ReviewService";

class ReviewController extends BaseController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { eventId, rating, comment } = req.body;
      if (!eventId || !rating || !comment) {
        this.sendError(res, "Event ID, rating, and comment are required");
        return;
      }
      const review = await ReviewService.createReview({
        eventId,
        userId: (req as any).user.id,
        rating,
        comment,
      });
      this.sendSuccess(res, review, 201);
    } catch (error: any) {
      this.sendError(res, error.message);
    }
  }

  async getByEvent(req: Request, res: Response): Promise<void> {
    try {
      const reviews = await ReviewService.getEventReviews(req.params.eventId);
      const avgRating = await ReviewService.getAverageRating(req.params.eventId);
      this.sendSuccess(res, { reviews, averageRating: avgRating });
    } catch (error: any) {
      this.sendError(res, error.message, 500);
    }
  }
}

export default new ReviewController();
