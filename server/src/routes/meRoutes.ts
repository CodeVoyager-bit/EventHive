import { Router } from "express";
import MeController from "../controllers/MeController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", (req, res) => MeController.getProfile(req, res));
router.get("/for-you", (req, res) => MeController.forYou(req, res));
router.get("/passport", (req, res) => MeController.passport(req, res));
router.get("/door", (req, res) => MeController.doorDuty(req, res));
router.post("/reports", (req, res) => MeController.report(req, res));
router.get("/calendar", (req, res) => MeController.calendar(req, res));
router.post("/calendar/reset", (req, res) => MeController.resetCalendar(req, res));

router.get("/saved", (req, res) => MeController.getSaved(req, res));
router.get("/saved/ids", (req, res) => MeController.getSavedIds(req, res));
router.put("/saved/:eventId", (req, res) => MeController.save(req, res));
router.delete("/saved/:eventId", (req, res) => MeController.unsave(req, res));

router.get("/following/ids", (req, res) => MeController.getFollowingIds(req, res));
router.put("/following/:hostId", (req, res) => MeController.follow(req, res));
router.delete("/following/:hostId", (req, res) => MeController.unfollow(req, res));

router.get("/notifications", (req, res) => MeController.getNotifications(req, res));
router.get("/notifications/unread", (req, res) => MeController.getUnread(req, res));
router.post("/notifications/read", (req, res) => MeController.markRead(req, res));
router.post("/notifications/:id/read", (req, res) => MeController.markRead(req, res));

router.get("/waitlist", (req, res) => MeController.getWaitlist(req, res));

export default router;
