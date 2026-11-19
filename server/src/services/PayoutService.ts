import EventRepository from "../repositories/EventRepository";
import BookingRepository from "../repositories/BookingRepository";
import { round } from "../domain/policies";

const DAY = 86_400_000;
const PAYOUT_DELAY_DAYS = 3;

type PayoutStatus = "upcoming" | "scheduled" | "paid" | "cancelled";

// Host settlements (mocked, like the payment gateway). Ticket money is held until the event has
// happened and paid out three days later, the way Eventbrite and Luma settle after an event.
// ponytail: worked out on read from bookings; real payouts need a payout provider and a ledger collection.
class PayoutService {
  async forHost(organizerId: string) {
    const events = (await EventRepository.findByOrganizer(organizerId)).filter((e) => e.status !== "draft");
    const totals = await BookingRepository.payoutTotals(events.map((e) => e._id));
    const now = Date.now();

    const rows = events
      .map((e) => {
        const t = totals.get(String(e._id)) ?? { tickets: 0, sales: 0, fees: 0, kept: 0 };
        const payout = round(t.sales - t.fees + t.kept);
        const payoutDate = new Date(e.date.getTime() + PAYOUT_DELAY_DAYS * DAY);
        const status: PayoutStatus =
          e.status === "cancelled" && payout === 0
            ? "cancelled"
            : e.date.getTime() > now
              ? "upcoming"
              : payoutDate.getTime() > now
                ? "scheduled"
                : "paid";
        return {
          _id: e._id,
          title: e.title,
          date: e.date,
          category: e.category,
          status,
          tickets: t.tickets,
          sales: round(t.sales),
          fees: round(t.fees),
          kept: round(t.kept),
          payout,
          payoutDate: status === "cancelled" ? null : payoutDate,
          reference: status === "paid" ? `PO-${String(e._id).slice(-8).toUpperCase()}` : null,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const total = (s: PayoutStatus) => round(rows.filter((r) => r.status === s).reduce((n, r) => n + r.payout, 0));
    const next = rows
      .filter((r) => r.status === "scheduled" && r.payout > 0)
      .sort((a, b) => a.payoutDate!.getTime() - b.payoutDate!.getTime())[0];
    return {
      delayDays: PAYOUT_DELAY_DAYS,
      summary: {
        paid: total("paid"),
        scheduled: total("scheduled"),
        upcoming: total("upcoming"),
        next: next ? { amount: next.payout, date: next.payoutDate, title: next.title } : null,
      },
      events: rows,
    };
  }
}

export default new PayoutService();
