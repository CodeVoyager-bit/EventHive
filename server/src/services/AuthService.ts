import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserRepository from "../repositories/UserRepository";
import { IUser } from "../models/User";

// Self-registration may only create these roles; admins are provisioned out of band.
const SELF_REGISTER_ROLES = ["attendee", "organizer"] as const;
type SelfRegisterRole = (typeof SELF_REGISTER_ROLES)[number];

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
    role: string
  ): Promise<{ user: Partial<IUser>; token: string }> {
    if (!SELF_REGISTER_ROLES.includes(role as SelfRegisterRole)) {
      throw new Error("Invalid role");
    }

    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await UserRepository.create({
      name,
      email,
      password: hashedPassword,
      role: role as SelfRegisterRole,
    });

    const token = this.generateToken(user);
    const { password: _, ...userWithoutPassword } = user.toObject();
    return { user: userWithoutPassword, token };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: Partial<IUser>; token: string }> {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    const token = this.generateToken(user);
    const { password: _, ...userWithoutPassword } = user.toObject();
    return { user: userWithoutPassword, token };
  }

  private generateToken(user: IUser): string {
    return jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as jwt.SignOptions
    );
  }

  verifyToken(token: string): jwt.JwtPayload {
    return jwt.verify(token, this.jwtSecret) as jwt.JwtPayload;
  }
}

export default new AuthService();
