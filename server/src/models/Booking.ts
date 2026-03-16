import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  bookingDate: Date;
  status: "confirmed" | "cancelled";
  ticketType: "general" | "vip";
  ticketCode: string;
  amount: number;
}

const BookingSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  bookingDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["confirmed", "cancelled"],
    default: "confirmed",
  },
  ticketType: {
    type: String,
    enum: ["general", "vip"],
    default: "general",
  },
  ticketCode: { type: String, required: true },
  amount: { type: Number, required: true },
});

const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
export default Booking;
