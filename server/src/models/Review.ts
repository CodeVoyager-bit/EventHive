import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
}

const ReviewSchema: Schema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

// One review per user per event
ReviewSchema.index({ userId: 1, eventId: 1 }, { unique: true });
ReviewSchema.index({ eventId: 1 });

const Review = mongoose.model<IReview>("Review", ReviewSchema);
export default Review;
