import { Router } from "express";
import MeController from "../controllers/MeController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/saved", (req, res) => MeController.getSaved(req, res));
router.get("/saved/ids", (req, res) => MeController.getSavedIds(req, res));
router.put("/saved/:eventId", (req, res) => MeController.save(req, res));
router.delete("/saved/:eventId", (req, res) => MeController.unsave(req, res));

export default router;
