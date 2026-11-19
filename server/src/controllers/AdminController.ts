import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import AdminService from "../services/AdminService";
import ReportService from "../services/ReportService";
import { requireUser } from "../middleware/auth";
import { objectId, resolveReportSchema, verifySchema } from "../schemas";

class AdminController extends BaseController {
  async stats(_req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await AdminService.stats());
  }

  async hosts(_req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await AdminService.hosts());
  }

  async verify(req: Request, res: Response): Promise<void> {
    const { verified } = verifySchema.parse(req.body);
    this.sendSuccess(res, await AdminService.verifyHost(objectId.parse(req.params.id), verified));
  }

  async reports(_req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await ReportService.queue());
  }

  async resolveReport(req: Request, res: Response): Promise<void> {
    const { action } = resolveReportSchema.parse(req.body);
    this.sendSuccess(res, await ReportService.resolve(objectId.parse(req.params.id), requireUser(req), action));
  }
}

export default new AdminController();
