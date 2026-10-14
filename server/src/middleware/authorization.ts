import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { getPrisma } from "../prisma.js";

async function validateSession(req: Request, res: Response): Promise<UserRole | null> {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required. Please log in.", code: "UNAUTHENTICATED" });
    return null;
  }
  const user = await getPrisma().user.findUnique({
    where: { id: req.session.userId },
    select: { isActive: true, role: true },
  });
  if (!user?.isActive) {
    req.session.destroy(() => {});
    res.clearCookie("toktickit_session", { path: "/" });
    res.status(401).json({ error: "User session is invalid or inactive.", code: "UNAUTHENTICATED" });
    return null;
  }
  // Downstream ownership checks also use the current account role.
  req.session.role = user.role;
  return user.role;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (await validateSession(req, res)) next();
  } catch {
    res.status(500).json({ error: "Internal server error." });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await validateSession(req, res);
      if (!role) return;
      if (!allowedRoles.includes(role)) {
        res.status(403).json({ error: "Access denied: Insufficient permissions for this role.", code: "FORBIDDEN" });
        return;
      }
      next();
    } catch {
      res.status(500).json({ error: "Internal server error." });
    }
  };
}
