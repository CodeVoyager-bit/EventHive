import { Router } from "express";
import EventController from "../controllers/EventController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";

const router = Router();

// Public routes
router.get("/", (req, res) => EventController.getAll(req, res));
router.get("/search", (req, res) => EventController.search(req, res));
router.get("/:id", (req, res) => EventController.getById(req, res));

// Protected routes (organizer only)
router.post(
  "/",
  authenticate,
  authorize("organizer", "admin"),
  (req, res) => EventController.create(req, res)
);

router.get(
  "/my/events",
  authenticate,
  authorize("organizer", "admin"),
  (req, res) => EventController.getMyEvents(req, res)
);

router.put(
  "/:id",
  authenticate,
  authorize("organizer", "admin"),
  (req, res) => EventController.update(req, res)
);

router.delete(
  "/:id",
  authenticate,
  authorize("organizer", "admin"),
  (req, res) => EventController.delete(req, res)
);

export default router;
