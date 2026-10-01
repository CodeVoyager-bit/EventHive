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
      .populate("eventId", "title date location price imageUrl category")
      .sort({ bookingDate: -1 });
  }

  async findByEvent(eventId: string): Promise<IBooking[]> {
    return Booking.find({ eventId })
      .populate("userId", "name email")
      .sort({ bookingDate: -1 });
  }

  async hasConfirmed(userId: string, eventId: string): Promise<boolean> {
    return !!(await Booking.exists({ userId, eventId, status: "confirmed" }));
  }

  async update(id: string, data: Partial<IBooking>): Promise<IBooking | null> {
    return Booking.findByIdAndUpdate(id, data, { new: true });
  }

  async getRevenueByEvent(eventId: string): Promise<number> {
    const result = await Booking.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId), status: "confirmed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async cancelAllByEvent(eventId: string): Promise<void> {
    await Booking.updateMany(
      { eventId, status: "confirmed" },
      { $set: { status: "cancelled" } }
    );
  }
}

export default new BookingRepository();
