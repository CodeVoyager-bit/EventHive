import { Router } from "express";
import BookingController from "../controllers/BookingController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";

const router = Router();
const host = [authenticate, authorize("organizer", "admin")];

// All booking routes require auth
router.post("/", authenticate, (req, res) => BookingController.create(req, res));
router.get("/my", authenticate, (req, res) => BookingController.getMyBookings(req, res));
router.get("/event/:eventId", ...host, (req, res) => BookingController.getEventBookings(req, res));
router.get("/:id", authenticate, (req, res) => BookingController.getById(req, res));
router.patch("/:id/cancel", authenticate, (req, res) => BookingController.cancel(req, res));

// Organizer: approval-required events
router.patch("/:id/approve", ...host, (req, res) => BookingController.approve(req, res));
router.patch("/:id/decline", ...host, (req, res) => BookingController.decline(req, res));

export default router;
