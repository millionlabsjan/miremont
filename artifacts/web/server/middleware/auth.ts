import { Request, Response, NextFunction } from "express";
import type { Role } from "../../shared/constants";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: Role;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!roles.includes(req.session.role!)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}
