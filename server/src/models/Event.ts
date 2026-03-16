import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description: string;
  date: Date;
  location: string;
  capacity: number;
  bookedCount: number;
  price: number;
  category: string;
  imageUrl: string;
  organizerId: mongoose.Types.ObjectId;
  eventType: "online" | "venue";
  meetingLink?: string;
  platform?: string;
  address?: string;
  mapLocation?: string;
  status: "draft" | "published" | "cancelled";
  createdAt: Date;
}

// Base Event schema with discriminator key for Inheritance
const EventSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  bookedCount: { type: Number, default: 0 },
  price: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    required: true,
    enum: ["music", "tech", "sports", "art", "food", "business", "other"],
  },
  imageUrl: { type: String, default: "" },
  organizerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  eventType: {
    type: String,
    enum: ["online", "venue"],
    required: true,
  },
  meetingLink: { type: String },
  platform: { type: String },
  address: { type: String },
  mapLocation: { type: String },
  status: {
    type: String,
    enum: ["draft", "published", "cancelled"],
    default: "published",
  },
  createdAt: { type: Date, default: Date.now },
});

const Event = mongoose.model<IEvent>("Event", EventSchema);
export default Event;


// OOP Inheritance classes
export abstract class BaseEvent {
  constructor(
    public title: string,
    public description: string,
    public date: Date,
    public capacity: number,
    public price: number
  ) {}

  abstract getDetails(): string;

  isAvailable(): boolean {
    return true;
  }
}

export class OnlineEvent extends BaseEvent {
  constructor(
    title: string,
    description: string,
    date: Date,
    capacity: number,
    price: number,
    public meetingLink: string,
    public platform: string
  ) {
    super(title, description, date, capacity, price);
  }

  getDetails(): string {
    return `Online Event: ${this.title} on ${this.platform} — ${this.meetingLink}`;
  }
}

export class VenueEvent extends BaseEvent {
  constructor(
    title: string,
    description: string,
    date: Date,
    capacity: number,
    price: number,
    public address: string,
    public mapLocation: string
  ) {
    super(title, description, date, capacity, price);
  }

  getDetails(): string {
    return `Venue Event: ${this.title} at ${this.address}`;
  }
}
