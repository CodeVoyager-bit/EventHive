import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import UserService from "../services/UserService";
import { objectId, recentQuery } from "../schemas";

class HostController extends BaseController {
  async list(req: Request, res: Response): Promise<void> {
    const { limit } = recentQuery.parse(req.query);
    this.sendSuccess(res, await UserService.listHosts(limit));
  }

  async getById(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await UserService.getHost(objectId.parse(req.params.id)));
  }
}

export default new HostController();
