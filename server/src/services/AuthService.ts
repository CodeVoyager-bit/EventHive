import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserRepository from "../repositories/UserRepository";
import { IUser } from "../models/User";
import { HttpError } from "../middleware/errorHandler";

// Self-registration may only create these roles; admins are provisioned out of band.
export type SelfRegisterRole = "attendee" | "organizer";

class AuthService {
  // Read lazily so env is loaded (and tests can set it) before first use.
  private get jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not set");
    return secret;
  }

  private get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || "7d";
  }

  async register(
    name: string,
    email: string,
    password: string,
    role: SelfRegisterRole
  ): Promise<{ user: Partial<IUser>; token: string }> {
    if (await UserRepository.findByEmail(email)) {
      throw new HttpError(409, "Email already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await UserRepository.create({ name, email, password: hashedPassword, role });
    return { user: this.publicUser(user), token: this.generateToken(user) };
  }

  async login(email: string, password: string): Promise<{ user: Partial<IUser>; token: string }> {
    const user = await UserRepository.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new HttpError(401, "Invalid email or password");
    }
    return { user: this.publicUser(user), token: this.generateToken(user) };
  }

  verifyToken(token: string): jwt.JwtPayload {
    return jwt.verify(token, this.jwtSecret) as jwt.JwtPayload;
  }

  private publicUser(user: IUser): Partial<IUser> {
    const { password: _, ...rest } = user.toObject();
    return rest;
  }

  private generateToken(user: IUser): string {
    return jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as jwt.SignOptions
    );
  }
}

export default new AuthService();
