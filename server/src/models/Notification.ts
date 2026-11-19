import mongoose, { Schema, Document, Types } from "mongoose";

export type NotificationKind =
  | "booking_request"
  | "booking_approved"
  | "booking_declined"
  | "waitlist_promoted"
  | "ticket_received"
  | "event_updated"
  | "event_cancelled"
  | "announcement"
  | "new_event"
  | "new_review"
  | "review_reply"
  | "reminder"
  | "almost_gone"
  | "price_ending"
  | "question"
  | "answer"
  | "door_team"
  | "on_sale"
  | "event_removed"
  | "report_resolved";

// In-app notification centre (the project sends no email or SMS)
export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string;
  readAt?: Date;
  dedupeKey?: string; // stops lazily generated reminders from repeating
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: "" },
  link: { type: String, default: "/" },
  readAt: { type: Date },
  dedupeKey: { type: String },
  createdAt: { type: Date, default: Date.now },
});

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } });

const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
export default Notification;
