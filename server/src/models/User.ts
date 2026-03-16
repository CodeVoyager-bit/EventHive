import mongoose, { Schema, Document } from "mongoose";

// Interface for User document
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "attendee" | "organizer" | "admin";
  createdAt: Date;
}

// Base User schema — Inheritance: Organizer, Attendee, Admin all extend User
const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ["attendee", "organizer", "admin"],
    default: "attendee",
  },
  createdAt: { type: Date, default: Date.now },
});

// Encapsulation: instance method hidden behind the model
UserSchema.methods.getPublicProfile = function (): Partial<IUser> {
  const { password, ...profile } = this.toObject();
  return profile;
};

const User = mongoose.model<IUser>("User", UserSchema);
export default User;


// OOP Classes for role-based behavior (used in services layer)
export abstract class BaseUser {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public role: string
  ) {}

  abstract getPermissions(): string[];
}

export class Attendee extends BaseUser {
  constructor(id: string, name: string, email: string) {
    super(id, name, email, "attendee");
  }

  getPermissions(): string[] {
    return ["browse_events", "book_ticket", "leave_review", "view_tickets"];
  }
}

export class Organizer extends BaseUser {
  constructor(id: string, name: string, email: string) {
    super(id, name, email, "organizer");
  }

  getPermissions(): string[] {
    return ["create_event", "update_event", "delete_event", "view_dashboard"];
  }
}

export class Admin extends BaseUser {
  constructor(id: string, name: string, email: string) {
    super(id, name, email, "admin");
  }

  getPermissions(): string[] {
    return ["ban_user", "approve_event", "manage_platform"];
  }
}
