import { Request, Response, NextFunction } from "express";
import { HttpError } from "./errorHandler";
import { Role } from "./auth";

// RBAC middleware: Role-Based Access Control
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, "Authentication required"));
    } else if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "Insufficient permissions for this action"));
    } else {
      next();
    }
  };
}
