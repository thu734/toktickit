import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

/**
 * Middleware enforcing mandatory first-login password change (BR-02, FR-03).
 * Intercepts requests for users with mustChangePassword = true and blocks access
 * to standard application endpoints (returning HTTP 403 Forbidden with code MUST_CHANGE_PASSWORD).
 * 
 * Permitted endpoints while locked:
 * - POST /api/auth/change-password
 * - POST /api/auth/logout
 * - GET /api/auth/me
 * - GET /api/health
 */
export async function mustChangePasswordLock(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.session?.userId;
  if (!userId) {
    next();
    return;
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mustChangePassword: true, isActive: true },
    });

    if (user && user.isActive && user.mustChangePassword) {
      const allowedPaths = [
        "/api/auth/change-password",
        "/api/auth/logout",
        "/api/auth/me",
        "/api/auth/login",
        "/api/health",
      ];

      const currentPath = req.path.toLowerCase();
      const isAllowed = allowedPaths.some((allowed) => currentPath === allowed || currentPath === `${allowed}/`);

      if (!isAllowed) {
        res.status(403).json({
          error: "Password change required. You must change your initial password before accessing other endpoints.",
          code: "MUST_CHANGE_PASSWORD",
        });
        return;
      }
    }
  } catch (error) {
    console.error("mustChangePasswordLock middleware error:", error);
  }

  next();
}
