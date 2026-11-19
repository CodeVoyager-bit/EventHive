import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import TicketService from "../services/TicketService";
import { requireUser } from "../middleware/auth";
import { checkInSchema, objectId, transferSchema } from "../schemas";

class TicketController extends BaseController {
  async getMine(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await TicketService.myTickets(requireUser(req).id));
  }

  async transfer(req: Request, res: Response): Promise<void> {
    const { email } = transferSchema.parse(req.body);
    this.sendSuccess(res, await TicketService.transfer(objectId.parse(req.params.id), requireUser(req).id, email));
  }

  async checkIn(req: Request, res: Response): Promise<void> {
    const { eventId, code } = checkInSchema.parse(req.body);
    this.sendSuccess(res, await TicketService.checkIn(eventId, code, requireUser(req)));
  }

  async admit(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await TicketService.admitById(objectId.parse(req.params.id), requireUser(req)));
  }
}

export default new TicketController();
