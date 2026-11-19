import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import EventService from "../services/EventService";
import BookingService from "../services/BookingService";
import WaitlistService from "../services/WaitlistService";
import AnnouncementService from "../services/AnnouncementService";
import UserService from "../services/UserService";
import QuestionService from "../services/QuestionService";
import DoorService from "../services/DoorService";
import PayoutService from "../services/PayoutService";
import AudienceService from "../services/AudienceService";
import { requireUser } from "../middleware/auth";
import {
  createEventSchema,
  updateEventSchema,
  listEventsQuery,
  objectId,
  statsQuery,
  quoteSchema,
  waitlistSchema,
  textBody,
  emailBody,
} from "../schemas";

const idParam = (req: Request) => objectId.parse(req.params.id);
const param = (req: Request, name: string) => objectId.parse(req.params[name]);

class EventController extends BaseController {
  async create(req: Request, res: Response): Promise<void> {
    const data = createEventSchema.parse(req.body);
    this.sendSuccess(res, await EventService.createEvent(data, requireUser(req).id), 201);
  }

  async getAll(req: Request, res: Response): Promise<void> {
    // Empty query params (e.g. ?category=) mean "no filter"
    const raw = Object.fromEntries(Object.entries(req.query).filter(([, v]) => v !== ""));
    const query = listEventsQuery.parse(raw);
    const { items, total } = await EventService.listEvents(query);
    this.sendPaginated(res, items, total, query.page, query.limit);
  }

  async getCities(_req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await EventService.getCities());
  }

  async getById(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await EventService.getPublicEvent(idParam(req), req.user));
  }

  async getSocial(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await EventService.getSocial(idParam(req)));
  }

  async getViewer(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await UserService.eventViewerState(requireUser(req).id, idParam(req)));
  }

  async quote(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await BookingService.quote(idParam(req), quoteSchema.parse(req.body)));
  }

  async getMyEvents(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await EventService.getEventsByOrganizer(requireUser(req).id));
  }

  async getMyStats(req: Request, res: Response): Promise<void> {
    const { days } = statsQuery.parse(req.query);
    this.sendSuccess(res, await EventService.getOrganizerStats(requireUser(req).id, days));
  }

  async getAnalytics(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await EventService.getAnalytics(idParam(req), requireUser(req)));
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = updateEventSchema.parse(req.body);
    const id = idParam(req);
    const event = await EventService.updateEvent(id, requireUser(req), data);
    await BookingService.promoteWaitlist(id); // more capacity may let people off the waitlist
    this.sendSuccess(res, event);
  }

  async view(req: Request, res: Response): Promise<void> {
    await EventService.recordView(idParam(req));
    this.sendSuccess(res, { counted: true });
  }

  async duplicate(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await EventService.duplicateEvent(idParam(req), requireUser(req)), 201);
  }

  async cancel(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await BookingService.cancelEvent(idParam(req), requireUser(req)));
  }

  async delete(req: Request, res: Response): Promise<void> {
    await EventService.deleteEvent(idParam(req), requireUser(req));
    this.sendSuccess(res, { message: "Event deleted" });
  }

  async getAnnouncements(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await AnnouncementService.list(idParam(req), req.user));
  }

  async postAnnouncement(req: Request, res: Response): Promise<void> {
    const { body } = textBody.parse(req.body);
    this.sendSuccess(res, await AnnouncementService.post(idParam(req), requireUser(req), body), 201);
  }

  async joinWaitlist(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await WaitlistService.join(requireUser(req).id, idParam(req), waitlistSchema.parse(req.body ?? {})), 201);
  }

  async leaveWaitlist(req: Request, res: Response): Promise<void> {
    await WaitlistService.leave(requireUser(req).id, idParam(req));
    this.sendSuccess(res, { left: true });
  }

  async getWaitlist(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await WaitlistService.forEvent(idParam(req), requireUser(req)));
  }

  // Ask the host
  async getQuestions(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await QuestionService.list(idParam(req), req.user));
  }

  async ask(req: Request, res: Response): Promise<void> {
    const { body } = textBody.parse(req.body);
    this.sendSuccess(res, await QuestionService.ask(idParam(req), requireUser(req).id, body), 201);
  }

  async answer(req: Request, res: Response): Promise<void> {
    const { body } = textBody.parse(req.body);
    this.sendSuccess(res, await QuestionService.answer(idParam(req), param(req, "qid"), requireUser(req), body));
  }

  async removeQuestion(req: Request, res: Response): Promise<void> {
    await QuestionService.remove(idParam(req), param(req, "qid"), requireUser(req));
    this.sendSuccess(res, { removed: true });
  }

  // Door team
  async getDoor(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await DoorService.desk(idParam(req), requireUser(req)));
  }

  async getTeam(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await DoorService.team(idParam(req), requireUser(req)));
  }

  async addToTeam(req: Request, res: Response): Promise<void> {
    const { email } = emailBody.parse(req.body);
    this.sendSuccess(res, await DoorService.add(idParam(req), requireUser(req), email), 201);
  }

  async removeFromTeam(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await DoorService.remove(idParam(req), requireUser(req), param(req, "userId")));
  }

  async getAudience(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await AudienceService.forHost(requireUser(req).id));
  }

  async getPayouts(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await PayoutService.forHost(requireUser(req).id));
  }
}

export default new EventController();
