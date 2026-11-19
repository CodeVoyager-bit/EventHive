import { Types } from "mongoose";
import Report, { IReport, ReportKind } from "../models/Report";

class ReportRepository {
  async create(data: Partial<IReport>): Promise<IReport> {
    return Report.create(data);
  }

  async findById(id: string): Promise<IReport | null> {
    return Report.findById(id);
  }

  async findOpen(limit = 200): Promise<IReport[]> {
    return Report.find({ status: "open" })
      .populate("reporterId", "name")
      .populate({ path: "eventId", select: "title date status organizerId", populate: { path: "organizerId", select: "name" } })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  // Closes every open report about one thing at once; returns who had reported it
  async resolveTarget(kind: ReportKind, targetId: Types.ObjectId, status: "dismissed" | "removed", adminId: string): Promise<Types.ObjectId[]> {
    const open = await Report.find({ kind, targetId, status: "open" }).select("reporterId");
    await Report.updateMany(
      { kind, targetId, status: "open" },
      { $set: { status, resolvedBy: new Types.ObjectId(adminId), resolvedAt: new Date() } }
    );
    return open.map((r) => r.reporterId);
  }
}

export default new ReportRepository();
