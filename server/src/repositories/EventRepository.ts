import { FilterQuery, SortOrder, Types } from "mongoose";
import Event, { IEvent } from "../models/Event";

// Public list views: secret addresses and online join links are only for ticket holders
// (see EventService.getPublicEvent), and promo codes are hidden by the schema.
const PUBLIC_LIST = "-address -mapLocation -meetingLink";

class EventRepository {
  async create(data: Partial<IEvent>): Promise<IEvent> {
    const event = new Event(data);
    return event.save();
  }

  // Promo codes and the door team are hidden by default; only the views that need them ask
  async findById(id: string, opts: { withPromos?: boolean; withTeam?: boolean } = {}): Promise<IEvent | null> {
    const q = Event.findById(id).populate("organizerId", "name verified");
    const extra = [opts.withPromos && "+promoCodes", opts.withTeam && "+team"].filter(Boolean).join(" ");
    return extra ? q.select(extra) : q;
  }

  async findTeam(id: string): Promise<{ _id: string; name: string; email: string }[]> {
    const e = await Event.findById(id).select("+team").populate<{ team: { _id: string; name: string; email: string }[] }>("team", "name email");
    return e?.team ?? [];
  }

  // Plain updates (no __v bump), so changing the door team never conflicts with a host's edit
  async addToTeam(id: string, userId: Types.ObjectId): Promise<void> {
    await Event.updateOne({ _id: id }, { $addToSet: { team: userId } });
  }

  async removeFromTeam(id: string, userId: string): Promise<void> {
    await Event.updateOne({ _id: id }, { $pull: { team: new Types.ObjectId(userId) } });
  }

  // Events someone helps run at the door, from a few hours ago onwards
  async findDoorDuty(userId: string, since: Date): Promise<IEvent[]> {
    return Event.find({ team: userId, status: "published", date: { $gte: since } })
      .select("title date location address eventType imageUrl category status organizerId")
      .populate("organizerId", "name verified")
      .sort({ date: 1 });
  }

  async findPaged(
    filter: FilterQuery<IEvent>,
    page: number,
    limit: number,
    sort: Record<string, SortOrder> = { date: 1 }
  ): Promise<{ items: IEvent[]; total: number }> {
    const [items, total] = await Promise.all([
      Event.find(filter)
        .select(PUBLIC_LIST)
        .populate("organizerId", "name verified")
        .sort({ ...sort, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Event.countDocuments(filter),
    ]);
    return { items, total };
  }

  async find(filter: FilterQuery<IEvent>, sort: Record<string, SortOrder> = { date: 1 }, limit = 50): Promise<IEvent[]> {
    return Event.find(filter).select(PUBLIC_LIST).populate("organizerId", "name verified").sort(sort).limit(limit);
  }

  async findByOrganizer(organizerId: string): Promise<IEvent[]> {
    return Event.find({ organizerId }).sort({ createdAt: -1 });
  }

  async idsByOrganizer(organizerId: string): Promise<Types.ObjectId[]> {
    return (await Event.find({ organizerId }).select("_id").lean()).map((e) => e._id);
  }

  // Upcoming published events per city, for the city picker
  async cityCounts(): Promise<{ city: string; count: number }[]> {
    return Event.aggregate([
      { $match: { status: "published", date: { $gte: new Date() } } },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, city: "$_id", count: 1 } },
    ]);
  }

  // Plain $inc without touching __v, so a view never conflicts with a host's edit
  async incViews(id: string): Promise<void> {
    await Event.updateOne({ _id: id, status: "published" }, { $inc: { views: 1 } });
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await Event.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((r) => [r._id, r.n]));
  }

  async save(event: IEvent): Promise<IEvent> {
    return event.save();
  }

  async setStatus(id: string, status: IEvent["status"]): Promise<IEvent | null> {
    return Event.findByIdAndUpdate(id, { $set: { status } }, { new: true });
  }

  async delete(id: string): Promise<IEvent | null> {
    return Event.findByIdAndDelete(id);
  }

  // Concurrency-safe: takes `qty` seats from one tier, and one use of a promo code, in a single
  // atomic update that only matches while both are still available. Returns false if either ran out.
  async reserveSeats(eventId: string, tierId: string, qty: number, promoCode?: string): Promise<boolean> {
    const tier = new Types.ObjectId(tierId);
    const filter: FilterQuery<IEvent> = {
      _id: eventId,
      tiers: { $elemMatch: { _id: tier, remaining: { $gte: qty } } },
    };
    const inc: Record<string, number> = { "tiers.$[t].remaining": -qty, bookedCount: qty, __v: 1 };
    const arrayFilters: Record<string, unknown>[] = [{ "t._id": tier }];
    if (promoCode) {
      filter.promoCodes = { $elemMatch: { code: promoCode, remaining: { $gt: 0 } } };
      inc["promoCodes.$[p].remaining"] = -1;
      arrayFilters.push({ "p.code": promoCode });
    }
    const res = await Event.updateOne(filter, { $inc: inc }, { arrayFilters });
    return res.modifiedCount === 1;
  }

  // Gives back seats (and the promo use, if the booking spent one)
  async releaseSeats(eventId: string, tierId: string, qty: number, promoCode?: string): Promise<void> {
    const tier = new Types.ObjectId(tierId);
    const inc: Record<string, number> = { "tiers.$[t].remaining": qty, bookedCount: -qty, __v: 1 };
    const arrayFilters: Record<string, unknown>[] = [{ "t._id": tier }];
    if (promoCode) {
      inc["promoCodes.$[p].remaining"] = 1;
      arrayFilters.push({ "p.code": promoCode });
    }
    await Event.updateOne({ _id: eventId, bookedCount: { $gte: qty } }, { $inc: inc }, { arrayFilters });
  }
}

export default new EventRepository();
