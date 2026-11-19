import { Router } from "express";
import HostController from "../controllers/HostController";

const router = Router();

// Public host profiles
router.get("/", (req, res) => HostController.list(req, res));
router.get("/:id", (req, res) => HostController.getById(req, res));

export default router;
