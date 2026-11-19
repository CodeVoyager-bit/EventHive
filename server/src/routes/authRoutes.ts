import { Router } from "express";
import AuthController from "../controllers/AuthController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/register", (req, res) => AuthController.register(req, res));
router.post("/login", (req, res) => AuthController.login(req, res));
router.patch("/profile", authenticate, (req, res) => AuthController.updateProfile(req, res));

export default router;
