import { Router } from "express";
import ReviewController from "../controllers/ReviewController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public: get reviews for an event
router.get("/event/:eventId", (req, res) => ReviewController.getByEvent(req, res));

// Protected: create a review
router.post("/", authenticate, (req, res) => ReviewController.create(req, res));

export default router;
