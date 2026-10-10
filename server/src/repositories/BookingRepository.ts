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

  async findByEventAndCode(eventId: string, ticketCode: string): Promise<IBooking | null> {
    return Booking.findOne({ eventId, ticketCode }).populate("userId", "name email");
  }

  // Atomic: only the first check-in wins, so a double scan cannot admit twice
  async markCheckedIn(id: string): Promise<IBooking | null> {
    return Booking.findOneAndUpdate(
      { _id: id, status: "confirmed", checkedInAt: { $exists: false } },
      { $set: { checkedInAt: new Date() } },
      { new: true }
    ).populate("userId", "name email");
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

  async dailyTotals(
    eventIds: mongoose.Types.ObjectId[],
    since: Date,
    timezone: string
  ): Promise<{ _id: string; bookings: number; revenue: number }[]> {
    if (eventIds.length === 0) return [];
    return Booking.aggregate([
      { $match: { eventId: { $in: eventIds }, status: "confirmed", bookingDate: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$bookingDate", timezone } },
          bookings: { $sum: 1 },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async cancelAllByEvent(eventId: string): Promise<void> {
    await Booking.updateMany(
      { eventId, status: "confirmed" },
      { $set: { status: "cancelled" } }
    );
  }
}

export default new BookingRepository();
