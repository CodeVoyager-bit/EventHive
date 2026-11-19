import HostQuestion, { IHostQuestion } from "../models/HostQuestion";

const answered = { "answer.body": { $exists: true } };

class QuestionRepository {
  async create(data: Partial<IHostQuestion>): Promise<IHostQuestion> {
    return (await HostQuestion.create(data)).populate("userId", "name");
  }

  async findById(id: string): Promise<IHostQuestion | null> {
    return HostQuestion.findById(id);
  }

  // Answered questions for everyone, plus the viewer's own waiting ones (every one of them for the host)
  async list(eventId: string, opts: { all: boolean; userId?: string }): Promise<IHostQuestion[]> {
    const filter = opts.all ? { eventId } : { eventId, $or: [answered, ...(opts.userId ? [{ userId: opts.userId }] : [])] };
    return HostQuestion.find(filter).populate("userId", "name").sort({ createdAt: -1 }).limit(50);
  }

  async findByIds(ids: string[]): Promise<IHostQuestion[]> {
    return HostQuestion.find({ _id: { $in: ids } });
  }

  async countWaiting(eventId: string, userId: string): Promise<number> {
    return HostQuestion.countDocuments({ eventId, userId, "answer.body": { $exists: false } });
  }

  async setAnswer(id: string, body: string): Promise<IHostQuestion | null> {
    return HostQuestion.findByIdAndUpdate(id, { $set: { answer: { body, createdAt: new Date() } } }, { new: true }).populate("userId", "name");
  }

  async delete(id: string): Promise<void> {
    await HostQuestion.deleteOne({ _id: id });
  }
}

export default new QuestionRepository();
