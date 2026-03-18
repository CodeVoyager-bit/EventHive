import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import BookingService from "../services/BookingService";

class BookingController extends BaseController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { eventId, ticketType } = req.body;
      if (!eventId) {
        this.sendError(res, "Event ID is required");
        return;
      }
      const booking = await BookingService.createBooking(
        (req as any).user.id,
        eventId,
        ticketType || "general"
      );
      this.sendSuccess(res, booking, 201);
    } catch (error: any) {
      this.sendError(res, error.message);
    }
  }

  async getMyBookings(req: Request, res: Response): Promise<void> {
    try {
      const bookings = await BookingService.getUserBookings((req as any).user.id);
      this.sendSuccess(res, bookings);
    } catch (error: any) {
      this.sendError(res, error.message, 500);
    }
  }

  async getEventBookings(req: Request, res: Response): Promise<void> {
    try {
      const bookings = await BookingService.getEventBookings(req.params.eventId);
      this.sendSuccess(res, bookings);
    } catch (error: any) {
      this.sendError(res, error.message, 500);
    }
  }

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const booking = await BookingService.cancelBooking(
        req.params.id,
        (req as any).user.id
      );
      this.sendSuccess(res, booking);
    } catch (error: any) {
      this.sendError(res, error.message);
    }
  }
}

export default new BookingController();
