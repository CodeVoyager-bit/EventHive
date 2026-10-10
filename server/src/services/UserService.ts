import UserRepository from "../repositories/UserRepository";
import EventService from "./EventService";
import { IUser } from "../models/User";
import { IEvent } from "../models/Event";

class UserService {
  async getUserById(id: string): Promise<IUser | null> {
    return UserRepository.findById(id);
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string }
  ): Promise<IUser | null> {
    return UserRepository.update(id, data);
  }

  async getAllUsers(): Promise<IUser[]> {
    return UserRepository.findAll();
  }

  // Saved (hearted) events. Saving is idempotent; unknown events are a 404.
  async saveEvent(userId: string, eventId: string): Promise<void> {
    await EventService.getEventById(eventId);
    await UserRepository.addSaved(userId, eventId);
  }

  async unsaveEvent(userId: string, eventId: string): Promise<void> {
    await UserRepository.removeSaved(userId, eventId);
  }

  async getSavedIds(userId: string): Promise<string[]> {
    return UserRepository.getSavedIds(userId);
  }

  async getSavedEvents(userId: string): Promise<IEvent[]> {
    return UserRepository.getSavedEvents(userId);
  }
}

export default new UserService();
