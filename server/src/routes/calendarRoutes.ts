import { Router } from "express";
import MeController from "../controllers/MeController";

const router = Router();

// The private calendar feed (the token in the URL is the only credential; calendar apps can't log in)
router.get("/:token", (req, res) => MeController.calendarFeed(req, res));

export default router;
