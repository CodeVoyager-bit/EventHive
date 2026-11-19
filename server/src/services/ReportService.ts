import { Types } from "mongoose";
import ReportRepository from "../repositories/ReportRepository";
import QuestionRepository from "../repositories/QuestionRepository";
import EventRepository from "../repositories/EventRepository";
import BookingService from "./BookingService";
import NotificationService from "./NotificationService";
import { IReport, ReportKind, REPORT_REASONS } from "../models/Report";
import { idOf } from "../lib/util";
import { HttpError } from "../middleware/errorHandler";
import { AuthUser } from "../middleware/auth";

type ReportInput = { kind: ReportKind; targetId: string; reason: (typeof REPORT_REASONS)[number]; note?: string };

// Trust and safety: guests report events or questions; admins dismiss the report or take the thing down
class ReportService {
  async report(userId: string, input: ReportInput): Promise<{ reported: true }> {
    let eventId: Types.ObjectId;
    if (input.kind === "event") {
      const event = await EventRepository.findById(input.targetId);
      if (!event || event.status !== "published") throw new HttpError(404, "Event not found");
      if (idOf(event.organizerId) === userId) throw new HttpError(400, "You can't report your own event");
      eventId = event._id;
    } else {
      const question = await QuestionRepository.findById(input.targetId);
      if (!question) throw new HttpError(404, "Question not found");
      if (idOf(question.userId) === userId) throw new HttpError(400, "That's your own question. You can delete it instead.");
      eventId = question.eventId;
    }
    try {
      await ReportRepository.create({
        kind: input.kind,
        targetId: new Types.ObjectId(input.targetId),
        eventId,
        reporterId: new Types.ObjectId(userId),
        reason: input.reason,
        note: input.note,
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new HttpError(409, "You've already reported this. Thanks, we're on it.");
      throw err;
    }
    return { reported: true };
  }

  // Open reports grouped by what they're about, most-reported first
  async queue() {
    const open = await ReportRepository.findOpen();
    const questionIds = open.filter((r) => r.kind === "question").map((r) => String(r.targetId));
    const questions = new Map((await QuestionRepository.findByIds(questionIds)).map((q) => [String(q._id), q.body]));
    const groups = new Map<string, { _id: string; kind: ReportKind; targetId: string; event: unknown; question: string | null; reports: unknown[] }>();
    for (const r of open) {
      const key = `${r.kind}:${r.targetId}`;
      if (!groups.has(key)) {
        groups.set(key, { _id: String(r._id), kind: r.kind, targetId: String(r.targetId), event: r.eventId, question: questions.get(String(r.targetId)) ?? null, reports: [] });
      }
      const reporter = r.reporterId as unknown as { name?: string } | null;
      groups.get(key)!.reports.push({ reason: r.reason, note: r.note, reporter: reporter?.name ?? "A guest", createdAt: r.createdAt });
    }
    return [...groups.values()].sort((a, b) => b.reports.length - a.reports.length);
  }

  async resolve(reportId: string, admin: AuthUser, action: "dismiss" | "remove") {
    const report = await ReportRepository.findById(reportId);
    if (!report) throw new HttpError(404, "Report not found");
    if (report.status !== "open") throw new HttpError(409, "This report has already been handled");
    if (action === "remove") await this.takeDown(report, admin);
    const reporters = await ReportRepository.resolveTarget(report.kind, report.targetId, action === "remove" ? "removed" : "dismissed", admin.id);
    if (action === "remove") {
      await NotificationService.notify(reporters, {
        kind: "report_resolved",
        title: "Thanks for your report",
        body: `We reviewed it and removed the ${report.kind === "event" ? "event" : "question"}.`,
        link: "/",
      });
    }
    return { resolved: reporters.length };
  }

  private async takeDown(report: IReport, admin: AuthUser) {
    if (report.kind === "question") {
      await QuestionRepository.delete(String(report.targetId));
      return;
    }
    const event = await EventRepository.findById(String(report.targetId));
    if (!event || event.status === "cancelled") return;
    if (event.date > new Date()) await BookingService.cancelEvent(String(event._id), admin, { removed: true }); // refunds everyone
    else await EventRepository.setStatus(String(event._id), "cancelled"); // already happened: just hide it
    await NotificationService.notify([event.organizerId], {
      kind: "event_removed",
      title: `${event.title} was taken down`,
      body: "It was reported and reviewed by the EventHive team. Anyone who booked has been refunded in full.",
      link: "/dashboard",
    });
  }
}

export default new ReportService();
