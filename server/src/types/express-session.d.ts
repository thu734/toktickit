import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  }
}
