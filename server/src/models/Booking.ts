import mongoose, { Schema, Document, Types } from "mongoose";
import { Breakdown } from "../domain/policies";

// A booking is the order: one tier, a quantity, the price breakdown and its state.
// Each admission it buys is a Ticket (see models/Ticket.ts).
export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";
export const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

export interface IBooking extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  bookingDate: Date;
  status: BookingStatus;
  tierId: Types.ObjectId;
  tierName: string;
  quantity: number;
  unitPrice: number;
  promoCode?: string;
  protection: boolean; // Refund Protection add-on
  refundPolicy: string; // the event's policy when this was bought (later edits don't change it)
  pricing: Breakdown;
  amount: number; // the host's ticket sales for this booking (subtotal - discount)
  answers: { question: string; answer: string }[];
  holderNames: string[]; // names for the tickets (issued now, or on approval)
  referrerId?: Types.ObjectId; // who shared the link that led to this booking
  viaWaitlist: boolean;
  transactionId?: string; // set when payment is captured (on booking, or on approval)
  refundAmount?: number;
  decidedAt?: Date; // approval or decline time
  cancelledAt?: Date;
}

const BookingSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  bookingDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "confirmed", "declined", "cancelled"],
    default: "confirmed",
  },
  tierId: { type: Schema.Types.ObjectId, required: true },
  tierName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  promoCode: { type: String },
  protection: { type: Boolean, default: false },
  refundPolicy: { type: String, default: "flexible" },
  pricing: {
    subtotal: Number,
    discount: Number,
    group: Number,
    fee: Number,
    gst: Number,
    protection: Number,
    total: Number,
  },
  amount: { type: Number, required: true },
  answers: [{ _id: false, question: String, answer: String }],
  holderNames: [String],
  referrerId: { type: Schema.Types.ObjectId, ref: "User" },
  viaWaitlist: { type: Boolean, default: false },
  transactionId: { type: String },
  refundAmount: { type: Number },
  decidedAt: { type: Date },
  cancelledAt: { type: Date },
});

// One active booking (pending or confirmed) per user per event, enforced by the database (race-safe)
BookingSchema.index(
  { userId: 1, eventId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE_STATUSES } } }
);
BookingSchema.index({ eventId: 1, status: 1 });
BookingSchema.index({ eventId: 1, referrerId: 1 });

const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
export default Booking;
