import { Request, Response, NextFunction } from "express";

// RBAC middleware: Role-Based Access Control
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions for this action",
      });
      return;
    }
    next();
  };
}
