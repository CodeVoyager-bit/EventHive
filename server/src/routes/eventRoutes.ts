import { Router } from "express";
import EventController from "../controllers/EventController";
import { authenticate, optionalAuth } from "../middleware/auth";
import { authorize } from "../middleware/rbac";

const router = Router();
const host = [authenticate, authorize("organizer", "admin")];

// Public (signed-in visitors may see more, e.g. a secret address once they hold a ticket)
router.get("/", (req, res) => EventController.getAll(req, res));
router.get("/cities", (req, res) => EventController.getCities(req, res));

// Organizer dashboard
router.get("/my/events", ...host, (req, res) => EventController.getMyEvents(req, res));
router.get("/my/stats", ...host, (req, res) => EventController.getMyStats(req, res));
router.get("/my/payouts", ...host, (req, res) => EventController.getPayouts(req, res));
router.get("/my/audience", ...host, (req, res) => EventController.getAudience(req, res));
router.post("/", ...host, (req, res) => EventController.create(req, res));

router.get("/:id", optionalAuth, (req, res) => EventController.getById(req, res));
router.get("/:id/social", (req, res) => EventController.getSocial(req, res));
router.get("/:id/viewer", authenticate, (req, res) => EventController.getViewer(req, res));
router.post("/:id/quote", (req, res) => EventController.quote(req, res));
router.post("/:id/view", (req, res) => EventController.view(req, res));
router.get("/:id/announcements", optionalAuth, (req, res) => EventController.getAnnouncements(req, res));

// Ask the host: public answers; guests see their own waiting questions, the host sees them all
router.get("/:id/qa", optionalAuth, (req, res) => EventController.getQuestions(req, res));
router.post("/:id/qa", authenticate, (req, res) => EventController.ask(req, res));
router.post("/:id/qa/:qid/answer", ...host, (req, res) => EventController.answer(req, res));
router.delete("/:id/qa/:qid", authenticate, (req, res) => EventController.removeQuestion(req, res));

// Door: the host or their door team (checked per event in DoorService)
router.get("/:id/door", authenticate, (req, res) => EventController.getDoor(req, res));
router.get("/:id/team", ...host, (req, res) => EventController.getTeam(req, res));
router.post("/:id/team", ...host, (req, res) => EventController.addToTeam(req, res));
router.delete("/:id/team/:userId", ...host, (req, res) => EventController.removeFromTeam(req, res));

// Waitlist (attendees join and leave; the host sees the line)
router.post("/:id/waitlist", authenticate, (req, res) => EventController.joinWaitlist(req, res));
router.delete("/:id/waitlist", authenticate, (req, res) => EventController.leaveWaitlist(req, res));
router.get("/:id/waitlist", ...host, (req, res) => EventController.getWaitlist(req, res));

// Managing one event
router.get("/:id/analytics", ...host, (req, res) => EventController.getAnalytics(req, res));
router.post("/:id/announcements", ...host, (req, res) => EventController.postAnnouncement(req, res));
router.post("/:id/cancel", ...host, (req, res) => EventController.cancel(req, res));
router.post("/:id/duplicate", ...host, (req, res) => EventController.duplicate(req, res));
router.put("/:id", ...host, (req, res) => EventController.update(req, res));
router.delete("/:id", ...host, (req, res) => EventController.delete(req, res));

export default router;
