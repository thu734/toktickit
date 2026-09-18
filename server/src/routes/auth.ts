import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { comparePassword } from "../utils/password.js";

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Authenticate user credentials and establish session.
 */
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== "string" || !email.trim()) {
      res.status(400).json({ error: "Email is required.", code: "INVALID_EMAIL" });
      return;
    }

    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "Password is required.", code: "INVALID_PASSWORD" });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: "insensitive",
        },
      },
    });

    // Reject non-existent user, invalid password, or inactive account (BR-01, AC-02)
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    // Establish session
    req.session.userId = user.id;
    req.session.role = user.role;

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate session cookie and destroy session state.
 */
authRouter.post("/logout", (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout session destroy error:", err);
      res.status(500).json({ error: "Failed to logout." });
      return;
    }
    res.clearCookie("toktickit_session", { path: "/" });
    res.status(200).json({ message: "Logged out successfully" });
  });
});

/**
 * GET /api/auth/me
 * Retrieve profile of currently authenticated session user.
 */
authRouter.get("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      req.session.destroy(() => {});
      res.clearCookie("toktickit_session", { path: "/" });
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});
