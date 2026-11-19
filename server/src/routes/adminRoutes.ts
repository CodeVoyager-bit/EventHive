import { Router } from "express";
import AdminController from "../controllers/AdminController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";

const router = Router();
router.use(authenticate, authorize("admin"));

router.get("/stats", (req, res) => AdminController.stats(req, res));
router.get("/hosts", (req, res) => AdminController.hosts(req, res));
router.patch("/hosts/:id", (req, res) => AdminController.verify(req, res));
router.get("/reports", (req, res) => AdminController.reports(req, res));
router.patch("/reports/:id", (req, res) => AdminController.resolveReport(req, res));

export default router;
