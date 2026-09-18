import { Request, Response, NextFunction } from "express";

/**
 * CSRF Protection Middleware
 * Enforces X-Requested-With: XMLHttpRequest header on state-mutating HTTP methods
 * (POST, PATCH, PUT, DELETE) to protect against Cross-Site Request Forgery attacks.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const isMutatingMethod = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method.toUpperCase());

  if (isMutatingMethod) {
    const customHeader = req.header("X-Requested-With");
    if (!customHeader || customHeader.toLowerCase() !== "xmlhttprequest") {
      res.status(400).json({
        error: "CSRF header check failed. X-Requested-With: XMLHttpRequest custom header required for state-mutating requests.",
        code: "CSRF_HEADER_MISSING",
      });
      return;
    }
  }

  next();
}
