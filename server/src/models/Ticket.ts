import mongoose, { Schema, Document, Types } from "mongoose";

// One admission. Bought through a Booking, but owned by whoever holds it now (transfers move it).
export interface ITicket extends Document {
  _id: Types.ObjectId;
  bookingId: Types.ObjectId;
  eventId: Types.ObjectId;
  ownerId: Types.ObjectId;
  holderName: string;
  tierName: string;
  ref: string; // 6 letters, unique per event; shown on the ticket and typed at the door
  secret: string; // seeds the rotating code; only the owner can read it
  status: "valid" | "void";
  checkedInAt?: Date;
  transferredAt?: Date;
  createdAt: Date;
}

const TicketSchema: Schema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  holderName: { type: String, required: true, trim: true },
  tierName: { type: String, required: true },
  ref: { type: String, required: true },
  secret: { type: String, required: true, select: false },
  status: { type: String, enum: ["valid", "void"], default: "valid" },
  checkedInAt: { type: Date },
  transferredAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

TicketSchema.index({ eventId: 1, ref: 1 }, { unique: true });
TicketSchema.index({ ownerId: 1 });
TicketSchema.index({ bookingId: 1 });

const Ticket = mongoose.model<ITicket>("Ticket", TicketSchema);
export default Ticket;
