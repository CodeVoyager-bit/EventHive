import { Request, Response, NextFunction } from "express";
import AuthService from "../services/AuthService";
import { HttpError } from "./errorHandler";

export type Role = "attendee" | "organizer" | "admin";
export type AuthUser = { id: string; email: string; role: Role };

// JWT authentication middleware: attaches req.user or fails with 401
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new HttpError(401, "Authentication required"));
    return;
  }
  try {
    const decoded = AuthService.verifyToken(header.slice("Bearer ".length));
    req.user = { id: String(decoded.id), email: String(decoded.email), role: decoded.role as Role };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

// For handlers behind authenticate(): returns the user without optional-chaining noise
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}
