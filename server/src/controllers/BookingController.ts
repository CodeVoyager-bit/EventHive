import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import BookingService from "../services/BookingService";
import { requireUser } from "../middleware/auth";
import { createBookingSchema, objectId } from "../schemas";

class BookingController extends BaseController {
  async create(req: Request, res: Response): Promise<void> {
    const input = createBookingSchema.parse(req.body);
    this.sendSuccess(res, await BookingService.createBooking(requireUser(req).id, input), 201);
  }

  async getMyBookings(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await BookingService.getUserBookings(requireUser(req).id));
  }

  async getById(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await BookingService.getBooking(objectId.parse(req.params.id), requireUser(req)));
  }

  async getEventBookings(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await BookingService.getEventBookings(objectId.parse(req.params.eventId), requireUser(req)));
  }

  async approve(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await BookingService.approve(objectId.parse(req.params.id), requireUser(req)));
  }

  async decline(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await BookingService.decline(objectId.parse(req.params.id), requireUser(req)));
  }

  async cancel(req: Request, res: Response): Promise<void> {
    this.sendSuccess(res, await BookingService.cancelBooking(objectId.parse(req.params.id), requireUser(req).id));
  }
}

export default new BookingController();
