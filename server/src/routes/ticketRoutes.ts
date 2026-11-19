import { Router } from "express";
import TicketController from "../controllers/TicketController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/my", authenticate, (req, res) => TicketController.getMine(req, res));
router.post("/:id/transfer", authenticate, (req, res) => TicketController.transfer(req, res));

// At the door (the host or their door team): scan a rotating QR / type a door code, or admit by name.
// Who may do this is decided per event in DoorService, so any signed-in role can be a helper.
router.post("/check-in", authenticate, (req, res) => TicketController.checkIn(req, res));
router.post("/:id/admit", authenticate, (req, res) => TicketController.admit(req, res));

export default router;
