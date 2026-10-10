import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import ReviewService from "../services/ReviewService";
import { requireUser } from "../middleware/auth";
import { createReviewSchema, objectId, recentQuery } from "../schemas";

class ReviewController extends BaseController {
  async create(req: Request, res: Response): Promise<void> {
    const { eventId, rating, comment } = createReviewSchema.parse(req.body);
    this.sendSuccess(res, await ReviewService.createReview(requireUser(req).id, eventId, rating, comment), 201);
  }

  async getRecent(req: Request, res: Response): Promise<void> {
    const { limit } = recentQuery.parse(req.query);
    this.sendSuccess(res, await ReviewService.getRecent(limit));
  }

  async getByEvent(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await ReviewService.getEventReviews(objectId.parse(req.params.eventId)));
  }
}

export default new ReviewController();
