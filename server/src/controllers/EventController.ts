import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import EventService from "../services/EventService";
import { requireUser } from "../middleware/auth";
import { createEventSchema, updateEventSchema, listEventsQuery, objectId } from "../schemas";

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

  async getById(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await EventService.getEventById(objectId.parse(req.params.id)));
  }

  async getMyEvents(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await EventService.getEventsByOrganizer(requireUser(req).id));
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = updateEventSchema.parse(req.body);
    this.sendSuccess(res, await EventService.updateEvent(objectId.parse(req.params.id), requireUser(req), data));
  }

  async delete(req: Request, res: Response): Promise<void> {
    await EventService.deleteEvent(objectId.parse(req.params.id), requireUser(req));
    this.sendSuccess(res, { message: "Event deleted" });
  }
}

export default new EventController();
