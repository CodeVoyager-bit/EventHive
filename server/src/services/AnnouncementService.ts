import { Types } from "mongoose";
import AnnouncementRepository from "../repositories/AnnouncementRepository";
import TicketRepository from "../repositories/TicketRepository";
import EventService from "./EventService";
import NotificationService from "./NotificationService";
import { idOf } from "../lib/util";
import { AuthUser } from "../middleware/auth";

// Host updates, visible only to the host and people holding a ticket (Posh-style activity feed)
class AnnouncementService {
  async post(eventId: string, user: AuthUser, body: string) {
    const event = await EventService.getOwnedEvent(eventId, user);
    const post = await AnnouncementRepository.create({
      eventId: event._id,
      authorId: new Types.ObjectId(user.id),
      body,
    });
    const holders = await TicketRepository.holderIds(eventId);
    await NotificationService.notify(holders, {
      kind: "announcement",
      title: `Update for ${event.title}`,
      body: body.length > 140 ? `${body.slice(0, 137)}...` : body,
      link: `/events/${eventId}#updates`,
    });
    return post;
  }

  // Everyone can see how many updates there are; only the host and ticket holders can read them
  async list(eventId: string, viewer?: AuthUser) {
    const event = await EventService.getEventById(eventId);
    const isHost = !!viewer && (viewer.role === "admin" || idOf(event.organizerId) === viewer.id);
    const canRead = isHost || (!!viewer && (await TicketRepository.holds(viewer.id, eventId)));
    if (!canRead) return { locked: true, count: await AnnouncementRepository.countByEvent(eventId), items: [] };
    const items = await AnnouncementRepository.findByEvent(eventId);
    return { locked: false, count: items.length, items };
  }
}

export default new AnnouncementService();
