import { FilterQuery, Types } from "mongoose";
import Booking, { BookingStatus, IBooking } from "../models/Booking";

// No address here: secret locations are only revealed through tickets (confirmed guests)
const EVENT_FIELDS = "title date location eventType price imageUrl category refundPolicy status organizerId";

class BookingRepository {
  async create(data: Partial<IBooking>): Promise<IBooking> {
    return new Booking(data).save();
  }

  async findById(id: string): Promise<IBooking | null> {
    return Booking.findById(id).populate("eventId", EVENT_FIELDS).populate("userId", "name email");
  }

  async findRaw(id: string): Promise<IBooking | null> {
    return Booking.findById(id);
  }

  async findByUser(userId: string): Promise<IBooking[]> {
    return Booking.find({ userId }).populate("eventId", EVENT_FIELDS).sort({ bookingDate: -1 });
  }

  async findByEvent(eventId: string): Promise<IBooking[]> {
    return Booking.find({ eventId })
      .populate("userId", "name email")
      .populate("referrerId", "name")
      .sort({ bookingDate: -1 });
  }

  async find(filter: FilterQuery<IBooking>): Promise<IBooking[]> {
    return Booking.find(filter);
  }

  async hasActive(userId: string, eventId: string): Promise<boolean> {
    return !!(await Booking.exists({ userId, eventId, status: { $in: ["pending", "confirmed"] } }));
  }

  async countByEvent(eventId: string, status: BookingStatus): Promise<number> {
    return Booking.countDocuments({ eventId, status });
  }

  // Atomic state transition: only applies if the booking is still in the expected state,
  // so two clicks (or a host and a guest acting at once) cannot both win.
  async transition(id: string, from: BookingStatus[], set: Partial<IBooking>): Promise<IBooking | null> {
    return Booking.findOneAndUpdate({ _id: id, status: { $in: from } }, { $set: set }, { new: true });
  }

  async getRevenueByEvent(eventId: string): Promise<number> {
    const [row] = await Booking.aggregate([
      { $match: { eventId: new Types.ObjectId(eventId), status: "confirmed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return row?.total ?? 0;
  }

  async dailyTotals(
    eventIds: Types.ObjectId[],
    since: Date,
    timezone: string
  ): Promise<{ _id: string; bookings: number; tickets: number; revenue: number }[]> {
    if (eventIds.length === 0) return [];
    return Booking.aggregate([
      { $match: { eventId: { $in: eventIds }, status: "confirmed", bookingDate: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$bookingDate", timezone } },
          bookings: { $sum: 1 },
          tickets: { $sum: "$quantity" },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async tierTotals(eventId: string): Promise<{ _id: Types.ObjectId; tickets: number; revenue: number }[]> {
    return Booking.aggregate([
      { $match: { eventId: new Types.ObjectId(eventId), status: "confirmed" } },
      { $group: { _id: "$tierId", tickets: { $sum: "$quantity" }, revenue: { $sum: "$amount" } } },
    ]);
  }

  // Who brought buyers in through their personal link
  async topReferrers(eventId: string, limit = 5): Promise<{ name: string; bookings: number; tickets: number }[]> {
    return Booking.aggregate([
      { $match: { eventId: new Types.ObjectId(eventId), status: "confirmed", referrerId: { $exists: true } } },
      { $group: { _id: "$referrerId", bookings: { $sum: 1 }, tickets: { $sum: "$quantity" } } },
      { $sort: { tickets: -1, bookings: -1 } },
      { $limit: limit },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $project: { _id: 0, name: { $ifNull: [{ $first: "$user.name" }, "Former user"] }, bookings: 1, tickets: 1 } },
    ]);
  }

  // Revenue (confirmed) and pending-request counts for many events in one pass
  async totalsByEvents(eventIds: Types.ObjectId[]): Promise<Map<string, { revenue: number; pending: number }>> {
    const rows = await Booking.aggregate<{ _id: Types.ObjectId; revenue: number; pending: number }>([
      { $match: { eventId: { $in: eventIds }, status: { $in: ["confirmed", "pending"] } } },
      {
        $group: {
          _id: "$eventId",
          revenue: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, "$amount", 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        },
      },
    ]);
    return new Map(rows.map((r) => [String(r._id), { revenue: r.revenue, pending: r.pending }]));
  }

  // Settlement inputs per event: tickets and sales from confirmed bookings, platform fees the host
  // chose to absorb, and ticket money kept from paid bookings cancelled without a full refund
  async payoutTotals(eventIds: Types.ObjectId[]): Promise<Map<string, { tickets: number; sales: number; fees: number; kept: number }>> {
    const rows = await Booking.aggregate<{ _id: Types.ObjectId; tickets: number; sales: number; fees: number; kept: number }>([
      { $match: { eventId: { $in: eventIds }, $or: [{ status: "confirmed" }, { status: "cancelled", transactionId: { $exists: true } }] } },
      {
        $set: {
          confirmed: { $eq: ["$status", "confirmed"] },
          // What the buyer would have paid on top, minus what they did pay = fees the host covered
          absorbed: { $max: [0, { $subtract: [{ $add: ["$amount", "$pricing.fee", "$pricing.gst", "$pricing.protection"] }, "$pricing.total"] }] },
        },
      },
      {
        $group: {
          _id: "$eventId",
          tickets: { $sum: { $cond: ["$confirmed", "$quantity", 0] } },
          sales: { $sum: { $cond: ["$confirmed", "$amount", 0] } },
          fees: { $sum: { $cond: ["$confirmed", "$absorbed", 0] } },
          kept: {
            $sum: {
              $cond: ["$confirmed", 0, { $max: [0, { $subtract: [{ $subtract: ["$amount", "$absorbed"] }, { $ifNull: ["$refundAmount", 0] }] }] }],
            },
          },
        },
      },
    ]);
    return new Map(rows.map(({ _id, ...t }) => [String(_id), t]));
  }

  // A host's audience: everyone with a confirmed booking at any of these events, one row per person
  async audience(eventIds: Types.ObjectId[]) {
    return Booking.aggregate<{
      _id: Types.ObjectId;
      name: string;
      email: string;
      city?: string;
      events: number;
      tickets: number;
      spent: number;
      first: Date;
      last: Date;
      lastEvent: string;
    }>([
      { $match: { eventId: { $in: eventIds }, status: "confirmed" } },
      { $sort: { bookingDate: 1 } },
      {
        $group: {
          _id: "$userId",
          eventIds: { $addToSet: "$eventId" },
          tickets: { $sum: "$quantity" },
          spent: { $sum: "$amount" },
          first: { $min: "$bookingDate" },
          last: { $max: "$bookingDate" },
          lastEventId: { $last: "$eventId" },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user", pipeline: [{ $project: { name: 1, email: 1, city: 1 } }] } },
      { $unwind: "$user" },
      { $lookup: { from: "events", localField: "lastEventId", foreignField: "_id", as: "lastEvent", pipeline: [{ $project: { title: 1 } }] } },
      {
        $project: {
          name: "$user.name",
          email: "$user.email",
          city: "$user.city",
          events: { $size: "$eventIds" },
          tickets: 1,
          spent: 1,
          first: 1,
          last: 1,
          lastEvent: { $ifNull: [{ $first: "$lastEvent.title" }, ""] },
        },
      },
      { $sort: { events: -1, spent: -1, name: 1 } },
    ]);
  }

  async referredBy(userId: string): Promise<number> {
    return Booking.countDocuments({ referrerId: userId, status: "confirmed" });
  }

  async totals(): Promise<{ bookings: number; tickets: number; gmv: number }> {
    const [row] = await Booking.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: null, bookings: { $sum: 1 }, tickets: { $sum: "$quantity" }, gmv: { $sum: "$pricing.total" } } },
    ]);
    return { bookings: row?.bookings ?? 0, tickets: row?.tickets ?? 0, gmv: row?.gmv ?? 0 };
  }
}

export default new BookingRepository();
