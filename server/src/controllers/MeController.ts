import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import UserService from "../services/UserService";
import { requireUser } from "../middleware/auth";
import { objectId } from "../schemas";

// Endpoints about the signed-in user (currently: saved events)
class MeController extends BaseController {
  async getSaved(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await UserService.getSavedEvents(requireUser(req).id));
  }

  async getSavedIds(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await UserService.getSavedIds(requireUser(req).id));
  }

  async save(req: Request, res: Response): Promise<void> {
    await UserService.saveEvent(requireUser(req).id, objectId.parse(req.params.eventId));
    this.sendSuccess(res, { saved: true });
  }

  async unsave(req: Request, res: Response): Promise<void> {
    await UserService.unsaveEvent(requireUser(req).id, objectId.parse(req.params.eventId));
    this.sendSuccess(res, { saved: false });
  }
}

export default new MeController();
