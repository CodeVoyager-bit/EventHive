import mongoose, { Schema, Document, Types } from "mongoose";

// "Ask the host": a guest's public question on an event page and the host's answer
export interface IHostQuestion extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  body: string;
  answer?: { body: string; createdAt: Date };
  createdAt: Date;
}

const HostQuestionSchema: Schema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true, trim: true },
  answer: { body: { type: String, trim: true }, createdAt: Date },
  createdAt: { type: Date, default: Date.now },
});

HostQuestionSchema.index({ eventId: 1, createdAt: -1 });

const HostQuestion = mongoose.model<IHostQuestion>("HostQuestion", HostQuestionSchema);
export default HostQuestion;
