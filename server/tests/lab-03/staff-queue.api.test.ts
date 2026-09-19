import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" };

describe("Lab 3 Staff Ticket Queue API Tests (STAFF-API-01, STAFF-API-07)", () => {
  let staffAgent: any;
  let adminAgent: any;
  let requesterAgent: any;
  let catId: number;

  beforeEach(async () => {
    const prisma = getPrisma();
    const initialPasswordHash = await bcrypt.hash("Initial123!", 10);

    // Reset password hashes & active status for test accounts
    await prisma.user.updateMany({
      where: {
        email: {
          in: ["alex.t@toktickit.local", "admin@toktickit.local", "jennifer.a@toktickit.local"],
        },
      },
      data: {
        passwordHash: initialPasswordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });

    const category = await prisma.category.findFirst();
    catId = category ? category.id : 1;

    // Login Staff (Alex Thompson)
    staffAgent = request.agent(app);
    await staffAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "alex.t@toktickit.local", password: "Initial123!" });
    await staffAgent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });

    // Login Admin (admin@toktickit.local)
    adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "admin@toktickit.local", password: "Initial123!" });
    await adminAgent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });

    // Login Requester (Jennifer Anderson)
    requesterAgent = request.agent(app);
    await requesterAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "jennifer.a@toktickit.local", password: "Initial123!" });
    await requesterAgent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });
  });

  it("STAFF-API-01: should return paginated staff ticket queue with filters, search, and pagination metadata", async () => {
    const res = await staffAgent.get("/api/staff/tickets?page=1&limit=10");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(10);
    expect(typeof res.body.pagination.totalItems).toBe("number");
    expect(typeof res.body.pagination.totalPages).toBe("number");
  });

  it("STAFF-API-01: should support searching queue by ticket number, summary, or description", async () => {
    const res = await staffAgent.get("/api/staff/tickets?search=laptop");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("STAFF-API-01: should allow Administrator read oversight access on GET /api/staff/tickets", async () => {
    const res = await adminAgent.get("/api/staff/tickets");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("STAFF-API-01: should deny Requester access to staff queue with HTTP 403 Forbidden", async () => {
    const res = await requesterAgent.get("/api/staff/tickets");
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("STAFF-API-07: should fall back safely to default pagination and sorting on invalid parameters with HTTP 200 OK", async () => {
    const res = await staffAgent.get(
      "/api/staff/tickets?page=-5&limit=invalid&sortBy=nonexistentField&sortOrder=unknownOrder"
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(10);
  });
});
