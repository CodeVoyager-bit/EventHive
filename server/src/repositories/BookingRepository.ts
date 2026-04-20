import Booking, { IBooking } from "../models/Booking";
import mongoose from "mongoose";

class BookingRepository {
  async create(data: Partial<IBooking>): Promise<IBooking> {
    const booking = new Booking(data);
    return booking.save();
  }

  async findById(id: string): Promise<IBooking | null> {
    return Booking.findById(id)
      .populate("eventId", "title date location price")
      .populate("userId", "name email");
  }

  async findByUser(userId: string): Promise<IBooking[]> {
    return Booking.find({ userId })
      .populate("eventId", "title date location price imageUrl")
      .sort({ bookingDate: -1 });
  }

  async findByEvent(eventId: string): Promise<IBooking[]> {
    return Booking.find({ eventId })
      .populate("userId", "name email")
      .sort({ bookingDate: -1 });
  }

  async update(id: string, data: Partial<IBooking>): Promise<IBooking | null> {
    return Booking.findByIdAndUpdate(id, data, { new: true });
  }

  async countByEvent(eventId: string): Promise<number> {
    return Booking.countDocuments({ eventId, status: "confirmed" });
  }

  async getRevenueByEvent(eventId: string): Promise<number> {
    const result = await Booking.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId), status: "confirmed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  }
}

export default new BookingRepository();
