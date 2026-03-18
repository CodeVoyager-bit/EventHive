import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import EventService from "../services/EventService";

class EventController extends BaseController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const eventData = { ...req.body, organizerId: (req as any).user.id };
      const event = await EventService.createEvent(eventData);
      this.sendSuccess(res, event, 201);
    } catch (error: any) {
      this.sendError(res, error.message);
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const filters: Record<string, unknown> = {};
      if (req.query.category) filters.category = req.query.category;
      if (req.query.eventType) filters.eventType = req.query.eventType;
      const events = await EventService.getAllEvents(filters);
      this.sendSuccess(res, events);
    } catch (error: any) {
      this.sendError(res, error.message, 500);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const event = await EventService.getEventById(req.params.id);
      if (!event) {
        this.sendError(res, "Event not found", 404);
        return;
      }
      this.sendSuccess(res, event);
    } catch (error: any) {
      this.sendError(res, error.message, 500);
    }
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      if (!query) {
        this.sendError(res, "Search query is required");
        return;
      }
      const events = await EventService.searchEvents(query);
      this.sendSuccess(res, events);
    } catch (error: any) {
      this.sendError(res, error.message, 500);
    }
  }

  async getMyEvents(req: Request, res: Response): Promise<void> {
    try {
      const events = await EventService.getEventsByOrganizer((req as any).user.id);
      this.sendSuccess(res, events);
    } catch (error: any) {
      this.sendError(res, error.message, 500);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const event = await EventService.updateEvent(
        req.params.id,
        (req as any).user.id,
        req.body
      );
      this.sendSuccess(res, event);
    } catch (error: any) {
      this.sendError(res, error.message);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await EventService.deleteEvent(req.params.id, (req as any).user.id);
      this.sendSuccess(res, { message: "Event deleted" });
    } catch (error: any) {
      this.sendError(res, error.message);
    }
  }
}

export default new EventController();
