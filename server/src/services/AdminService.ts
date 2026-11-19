import UserRepository from "../repositories/UserRepository";
import BookingRepository from "../repositories/BookingRepository";
import EventRepository from "../repositories/EventRepository";
import { HttpError } from "../middleware/errorHandler";

// Platform oversight from the original brief: totals, and verifying hosts (they get a badge)
class AdminService {
  async stats() {
    const [users, totals, eventRows] = await Promise.all([
      UserRepository.countByRole(),
      BookingRepository.totals(),
      EventRepository.countByStatus(),
    ]);
    return { users, events: eventRows, ...totals };
  }

  async hosts() {
    return UserRepository.find({ role: "organizer" }, 200);
  }

  async verifyHost(hostId: string, verified: boolean) {
    const host = await UserRepository.findPublic(hostId);
    if (!host || host.role !== "organizer") throw new HttpError(404, "Host not found");
    return UserRepository.update(hostId, { verified });
  }
}

export default new AdminService();
