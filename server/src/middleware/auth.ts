import { Request, Response, NextFunction } from "express";
import AuthService from "../services/AuthService";

// JWT authentication middleware
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = AuthService.verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}
