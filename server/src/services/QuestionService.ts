import { Types } from "mongoose";
import QuestionRepository from "../repositories/QuestionRepository";
import UserRepository from "../repositories/UserRepository";
import EventService from "./EventService";
import NotificationService from "./NotificationService";
import { IHostQuestion } from "../models/HostQuestion";
import { clip, idOf } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";
import { AuthUser } from "../middleware/auth";

const MAX_WAITING = 3; // unanswered questions per guest per event, so nobody floods a host

// "Ask the host" (Eventbrite/Luma-style public Q&A): answers help every future guest, not just the asker
class QuestionService {
  async list(eventId: string, viewer?: AuthUser): Promise<IHostQuestion[]> {
    const event = await EventService.getEventById(eventId);
    const isHost = !!viewer && (viewer.role === "admin" || idOf(event.organizerId) === viewer.id);
    return QuestionRepository.list(eventId, { all: isHost, userId: viewer?.id });
  }

  async ask(eventId: string, userId: string, body: string): Promise<IHostQuestion> {
    const event = await EventService.getEventById(eventId);
    if (event.status !== "published") throw new HttpError(409, "Questions are closed for this event");
    if (event.date <= new Date()) throw new HttpError(400, "This event has already started");
    if (idOf(event.organizerId) === userId) throw new HttpError(400, "You're the host. Post an update for your guests instead.");
    if ((await QuestionRepository.countWaiting(eventId, userId)) >= MAX_WAITING) {
      throw new HttpError(429, `You have ${MAX_WAITING} questions waiting for an answer. Give the host a moment.`);
    }
    const question = await QuestionRepository.create({ eventId: event._id, userId: new Types.ObjectId(userId), body });
    const asker = await UserRepository.findPublic(userId);
    await NotificationService.notify([event.organizerId], {
      kind: "question",
      title: `${asker?.name ?? "A guest"} asked about ${event.title}`,
      body: clip(body),
      link: `/events/${eventId}#questions`,
    });
    return question;
  }

  async answer(eventId: string, questionId: string, user: AuthUser, body: string): Promise<IHostQuestion> {
    const question = await this.find(eventId, questionId);
    const event = await EventService.getOwnedEvent(eventId, user);
    const updated = await QuestionRepository.setAnswer(questionId, body);
    await NotificationService.notify([question.userId], {
      kind: "answer",
      title: `The host answered your question about ${event.title}`,
      body: clip(body),
      link: `/events/${eventId}#questions`,
    });
    return updated!;
  }

  // The asker can take a question back; the host (or an admin) can remove any of them
  async remove(eventId: string, questionId: string, user: AuthUser): Promise<void> {
    const question = await this.find(eventId, questionId);
    const event = await EventService.getEventById(eventId);
    const allowed = user.role === "admin" || idOf(question.userId) === user.id || idOf(event.organizerId) === user.id;
    if (!allowed) throw new HttpError(403, "You can only remove your own questions");
    await QuestionRepository.delete(questionId);
  }

  private async find(eventId: string, questionId: string): Promise<IHostQuestion> {
    const question = await QuestionRepository.findById(questionId);
    if (!question || idOf(question.eventId) !== eventId) throw new HttpError(404, "Question not found");
    return question;
  }
}

export default new QuestionService();
