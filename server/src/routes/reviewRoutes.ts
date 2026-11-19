import { Router } from "express";
import ReviewController from "../controllers/ReviewController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";

const router = Router();

// Public: get reviews for an event
router.get("/recent", (req, res) => ReviewController.getRecent(req, res));
router.get("/event/:eventId", (req, res) => ReviewController.getByEvent(req, res));

// Protected: create a review
router.post("/", authenticate, (req, res) => ReviewController.create(req, res));

// Protected: the event's host answers a review
router.patch("/:id/reply", authenticate, authorize("organizer", "admin"), (req, res) => ReviewController.reply(req, res));

export default router;
