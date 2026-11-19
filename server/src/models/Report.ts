import mongoose, { Schema, Document, Types } from "mongoose";

export const REPORT_KINDS = ["event", "question"] as const;
export const REPORT_REASONS = ["scam", "spam", "offensive", "wrong_info", "other"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

// A guest flags an event or a question for the admins (trust and safety queue)
export interface IReport extends Document {
  _id: Types.ObjectId;
  kind: ReportKind;
  targetId: Types.ObjectId; // the event or the question
  eventId: Types.ObjectId; // the event it belongs to, for context
  reporterId: Types.ObjectId;
  reason: (typeof REPORT_REASONS)[number];
  note?: string;
  status: "open" | "dismissed" | "removed";
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
}

const ReportSchema: Schema = new Schema({
  kind: { type: String, enum: REPORT_KINDS, required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, enum: REPORT_REASONS, required: true },
  note: { type: String, trim: true },
  status: { type: String, enum: ["open", "dismissed", "removed"], default: "open" },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// One report per person per thing; the admin queue reads open reports newest first
ReportSchema.index({ reporterId: 1, kind: 1, targetId: 1 }, { unique: true });
ReportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model<IReport>("Report", ReportSchema);
export default Report;
