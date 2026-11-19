import mongoose, { Schema, Document, Types } from "mongoose";

// A host update posted to an event's ticket holders ("Doors moved to 7pm", "Bring a mat")
export interface IAnnouncement extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  createdAt: Date;
}

const AnnouncementSchema: Schema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

AnnouncementSchema.index({ eventId: 1, createdAt: -1 });

const Announcement = mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
export default Announcement;
