import BookingRepository from "../repositories/BookingRepository";
import EventRepository from "../repositories/EventRepository";
import UserRepository from "../repositories/UserRepository";
import { round } from "../domain/policies";

// The host's audience (Eventbrite/Luma "contacts"): everyone who has booked with them, regulars first.
// Followers who never booked are only counted; their emails stay private.
class AudienceService {
  async forHost(hostId: string) {
    const [eventIds, followerIds] = await Promise.all([EventRepository.idsByOrganizer(hostId), UserRepository.followerIds(hostId)]);
    const rows = await BookingRepository.audience(eventIds);
    const follows = new Set(followerIds.map(String));
    const people = rows.map((r) => ({ ...r, spent: round(r.spent), follows: follows.has(String(r._id)) }));
    const regulars = people.filter((p) => p.events >= 2).length;
    return {
      summary: {
        people: people.length,
        regulars,
        repeatRate: people.length ? Math.round((regulars / people.length) * 100) : 0,
        followers: follows.size,
        averageSpend: people.length ? round(people.reduce((n, p) => n + p.spent, 0) / people.length) : 0,
      },
      people,
    };
  }
}

export default new AudienceService();
