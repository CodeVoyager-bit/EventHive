import mongoose, { Schema, Document, Types } from "mongoose";

// A place in line for a sold-out event. When seats free up, the oldest entry whose party
// fits is booked automatically (see BookingService.promoteWaitlist).
export interface IWaitlist extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  tierId: Types.ObjectId;
  quantity: number;
  status: "waiting" | "promoted" | "left";
  bookingId?: Types.ObjectId;
  createdAt: Date;
}

const WaitlistSchema: Schema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tierId: { type: Schema.Types.ObjectId, required: true },
  quantity: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["waiting", "promoted", "left"], default: "waiting" },
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
  createdAt: { type: Date, default: Date.now },
});

WaitlistSchema.index(
  { eventId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: "waiting" } }
);
WaitlistSchema.index({ eventId: 1, status: 1, createdAt: 1 });

const Waitlist = mongoose.model<IWaitlist>("Waitlist", WaitlistSchema);
export default Waitlist;
