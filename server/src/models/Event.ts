import mongoose, { Schema, Document, Types } from "mongoose";
import { REFUND_POLICIES, RefundPolicyName } from "../domain/policies";

// A ticket tier (Early bird, General, VIP...). `remaining` is decremented atomically by bookings.
export interface ITier {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  price: number; // rupees
  capacity: number;
  remaining: number;
  salesEnd?: Date; // e.g. early bird ends; null = on sale until the event starts
  maxPerOrder: number;
}

export interface IPromoCode {
  code: string;
  kind: "percent" | "flat";
  amount: number; // percent (1-100) or rupees
  limit: number; // total uses allowed
  remaining: number; // uses left, decremented atomically
  expiresAt?: Date;
}

export interface IQuestion {
  _id: Types.ObjectId;
  label: string;
  required: boolean;
}

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  location: string; // the city ("Mumbai") or "Online"
  // Totals across tiers, kept in sync so listing, sorting and badges stay cheap
  capacity: number;
  bookedCount: number;
  price: number; // lowest tier price ("from ₹X")
  tiers: Types.DocumentArray<ITier & Types.Subdocument>;
  promoCodes: IPromoCode[];
  questions: Types.DocumentArray<IQuestion & Types.Subdocument>;
  category: string;
  imageUrl: string;
  organizerId: Types.ObjectId;
  eventType: "online" | "venue";
  meetingLink?: string;
  platform?: string;
  address?: string;
  mapLocation?: string;
  requiresApproval: boolean; // guests request, the host approves
  secretLocation: boolean; // address revealed only to confirmed guests
  showGuests: boolean; // show first names of who's going
  absorbFees: boolean; // host pays the platform fee instead of the buyer
  refundPolicy: RefundPolicyName;
  salesStart?: Date; // tickets go on sale at this time (null = as soon as it's published)
  groupDiscount?: { minQty: number; percent: number }; // e.g. 10% off 4+ tickets
  status: "draft" | "published" | "cancelled";
  publishedAt?: Date;
  views: number; // event page views by guests (for the host's conversion rate)
  team: Types.ObjectId[]; // door team: helpers who can check guests in, nothing else
  createdAt: Date;
}

const TierSchema = new Schema<ITier>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  capacity: { type: Number, required: true, min: 1 },
  remaining: { type: Number, required: true, min: 0 },
  salesEnd: { type: Date },
  maxPerOrder: { type: Number, default: 6, min: 1 },
});

const PromoSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    kind: { type: String, enum: ["percent", "flat"], required: true },
    amount: { type: Number, required: true, min: 1 },
    limit: { type: Number, required: true, min: 1 },
    remaining: { type: Number, required: true, min: 0 },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>({
  label: { type: String, required: true, trim: true },
  required: { type: Boolean, default: false },
});

// Base Event schema with discriminator key for Inheritance
const EventSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  bookedCount: { type: Number, default: 0 },
  price: { type: Number, required: true, min: 0 },
  tiers: { type: [TierSchema], default: [] },
  // Never sent to the public: codes are only readable by the event's own host
  promoCodes: { type: [PromoSchema], default: [], select: false },
  questions: { type: [QuestionSchema], default: [] },
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
  requiresApproval: { type: Boolean, default: false },
  secretLocation: { type: Boolean, default: false },
  showGuests: { type: Boolean, default: true },
  absorbFees: { type: Boolean, default: false },
  refundPolicy: { type: String, enum: REFUND_POLICIES, default: "flexible" },
  salesStart: { type: Date },
  groupDiscount: { type: { _id: false, minQty: { type: Number, min: 2 }, percent: { type: Number, min: 1, max: 50 } }, default: undefined },
  status: {
    type: String,
    enum: ["draft", "published", "cancelled"],
    default: "published",
  },
  publishedAt: { type: Date },
  views: { type: Number, default: 0 },
  // Who helps at the door is the host's business, so it is never sent with the public event
  team: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [], select: false },
  createdAt: { type: Date, default: Date.now },
}, {
  // A host saving an edit fails (409) if a booking changed seat counts since the page loaded;
  // reserveSeats/releaseSeats bump __v so this check sees them.
  optimisticConcurrency: true,
});

// Listing filters on status + date (+ city); the organizer dashboard filters on organizerId
EventSchema.index({ status: 1, date: 1 });
EventSchema.index({ status: 1, location: 1, date: 1 });
EventSchema.index({ organizerId: 1 });
EventSchema.index({ team: 1, date: 1 });

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
