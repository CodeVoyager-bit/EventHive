import Announcement, { IAnnouncement } from "../models/Announcement";

class AnnouncementRepository {
  async create(data: Partial<IAnnouncement>): Promise<IAnnouncement> {
    return new Announcement(data).save();
  }

  async findByEvent(eventId: string): Promise<IAnnouncement[]> {
    return Announcement.find({ eventId }).populate("authorId", "name").sort({ createdAt: -1 }).limit(50);
  }

  async countByEvent(eventId: string): Promise<number> {
    return Announcement.countDocuments({ eventId });
  }
}

export default new AnnouncementRepository();
