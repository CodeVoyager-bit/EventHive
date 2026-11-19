import { Types } from "mongoose";
import EventRepository from "../repositories/EventRepository";
import TicketRepository from "../repositories/TicketRepository";
import UserRepository from "../repositories/UserRepository";
import EventService from "./EventService";
import NotificationService from "./NotificationService";
import { IEvent } from "../models/Event";
import { idOf } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";
import { AuthUser } from "../middleware/auth";

const MAX_TEAM = 10;
const HOUR = 3_600_000;

// Door team (like Eventbrite Organizer or Luma check-in staff): helpers the host adds by email
// can scan tickets and admit guests, but never see money, emails or settings.
class DoorService {
  // The host, an admin, or someone on this event's door team
  async getDoorEvent(id: string, user: AuthUser): Promise<IEvent> {
    const event = await EventRepository.findById(id, { withTeam: true });
    if (!event) throw new HttpError(404, "Event not found");
    const allowed = user.role === "admin" || idOf(event.organizerId) === user.id || event.team.some((m) => String(m) === user.id);
    if (!allowed) throw new HttpError(403, "You're not on the door team for this event");
    return event;
  }

  async team(id: string, user: AuthUser) {
    await EventService.getOwnedEvent(id, user);
    return EventRepository.findTeam(id);
  }

  async add(id: string, user: AuthUser, email: string) {
    const event = await EventService.getOwnedEvent(id, user, { withTeam: true });
    if (event.status === "cancelled") throw new HttpError(409, "This event was cancelled");
    const member = await UserRepository.findByEmail(email);
    if (!member) throw new HttpError(404, "No EventHive account uses that email. Ask them to sign up first.");
    if (String(member._id) === idOf(event.organizerId)) throw new HttpError(400, "The host can always check guests in");
    if (event.team.some((m) => String(m) === String(member._id))) throw new HttpError(409, `${member.name} is already on the door team`);
    if (event.team.length >= MAX_TEAM) throw new HttpError(400, `A door team can have up to ${MAX_TEAM} people`);
    await EventRepository.addToTeam(id, member._id as Types.ObjectId);
    const host = (event.organizerId as unknown as { name?: string }).name ?? "The host";
    await NotificationService.notify([member._id as Types.ObjectId], {
      kind: "door_team",
      title: `You're on the door for ${event.title}`,
      body: `${host} added you to the door team. Open Door duty in My Tickets to scan guests in.`,
      link: `/door/${id}`,
    });
    return EventRepository.findTeam(id);
  }

  async remove(id: string, user: AuthUser, memberId: string) {
    await EventService.getOwnedEvent(id, user);
    await EventRepository.removeFromTeam(id, memberId);
    return EventRepository.findTeam(id);
  }

  // Everything the door needs and nothing more: names, tiers, references and check-in times
  async desk(id: string, user: AuthUser) {
    const event = await this.getDoorEvent(id, user);
    const tickets = await TicketRepository.findByEvent(id);
    return {
      event: {
        _id: event._id,
        title: event.title,
        date: event.date,
        location: event.location,
        address: event.address,
        eventType: event.eventType,
        category: event.category,
        imageUrl: event.imageUrl,
        status: event.status,
      },
      isHost: user.role === "admin" || idOf(event.organizerId) === user.id,
      guests: tickets
        .filter((t) => t.status === "valid")
        .map((t) => ({ _id: t._id, holderName: t.holderName, tierName: t.tierName, ref: t.ref, checkedInAt: t.checkedInAt })),
    };
  }

  // Events I help at, from a few hours ago (doors may still be open) onwards
  async duty(userId: string): Promise<IEvent[]> {
    return EventRepository.findDoorDuty(userId, new Date(Date.now() - 12 * HOUR));
  }
}

export default new DoorService();
