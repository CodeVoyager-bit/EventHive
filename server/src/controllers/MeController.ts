import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import UserService from "../services/UserService";
import NotificationService from "../services/NotificationService";
import WaitlistService from "../services/WaitlistService";
import DoorService from "../services/DoorService";
import ReportService from "../services/ReportService";
import { requireUser } from "../middleware/auth";
import { limitQuery, objectId, reportSchema } from "../schemas";

// Endpoints about the signed-in user: profile, saved events, follows, notifications, waitlists
class MeController extends BaseController {
  async getProfile(req: Request, res: Response): Promise<void> {
    const id = requireUser(req).id;
    const [user, referrals] = await Promise.all([UserService.getProfile(id), UserService.referralCount(id)]);
    this.sendSuccess(res, { ...user.toObject(), referrals });
  }

  async report(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await ReportService.report(requireUser(req).id, reportSchema.parse(req.body)), 201);
  }

  async calendar(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, { token: await UserService.calendarToken(requireUser(req).id) });
  }

  async resetCalendar(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, { token: await UserService.calendarToken(requireUser(req).id, true) });
  }

  // Public, but only to whoever has the secret link: calendar apps can't sign in.
  // `web` is the site's own origin (passed by the web app) so event links in the feed point back to it.
  async calendarFeed(req: Request, res: Response): Promise<void> {
    const token = String(req.params.token).replace(/\.ics$/, "");
    const web = typeof req.query.web === "string" && /^https?:\/\/[\w.-]+(:\d+)?$/.test(req.query.web) ? req.query.web : "";
    const ics = await UserService.calendarFeed(token, web);
    res.type("text/calendar; charset=utf-8").set("Cache-Control", "private, max-age=300").send(ics);
  }

  async forYou(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await UserService.forYou(requireUser(req).id));
  }

  async passport(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await UserService.passport(requireUser(req).id));
  }

  async doorDuty(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await DoorService.duty(requireUser(req).id));
  }

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

  async getFollowingIds(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await UserService.getFollowingIds(requireUser(req).id));
  }

  async follow(req: Request, res: Response): Promise<void> {
    await UserService.follow(requireUser(req).id, objectId.parse(req.params.hostId));
    this.sendSuccess(res, { following: true });
  }

  async unfollow(req: Request, res: Response): Promise<void> {
    await UserService.unfollow(requireUser(req).id, objectId.parse(req.params.hostId));
    this.sendSuccess(res, { following: false });
  }

  async getNotifications(req: Request, res: Response): Promise<void> {
    const { limit } = limitQuery.parse(req.query);
    this.sendSuccess(res, await NotificationService.list(requireUser(req).id, limit));
  }

  async getUnread(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, { unread: await NotificationService.unreadCount(requireUser(req).id) });
  }

  async markRead(req: Request, res: Response): Promise<void> {
    const id = req.params.id ? objectId.parse(req.params.id) : undefined;
    await NotificationService.markRead(requireUser(req).id, id);
    this.sendSuccess(res, { read: true });
  }

  async getWaitlist(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await WaitlistService.mine(requireUser(req).id));
  }
}

export default new MeController();
