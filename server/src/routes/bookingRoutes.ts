import { Router } from "express";
import BookingController from "../controllers/BookingController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";

const router = Router();

// All booking routes require auth
router.post("/", authenticate, (req, res) => BookingController.create(req, res));
router.get("/my", authenticate, (req, res) => BookingController.getMyBookings(req, res));
router.patch(
  "/:id/cancel",
  authenticate,
  (req, res) => BookingController.cancel(req, res)
);

// Organizer: view attendees for an event
router.get(
  "/event/:eventId",
  authenticate,
  authorize("organizer", "admin"),
  (req, res) => BookingController.getEventBookings(req, res)
);

export default router;
