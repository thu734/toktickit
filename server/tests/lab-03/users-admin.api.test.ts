import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" };

describe("Lab 3 Admin User Management API Tests (ADMIN-API-01..07, SEC-API-02)", () => {
  let adminAgent: ReturnType<typeof request.agent>;
  let staffAgent: ReturnType<typeof request.agent>;
  let requesterAgent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    const prisma = getPrisma();
    const initialPasswordHash = await bcrypt.hash("Initial123!", 10);

    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "jennifer.a@toktickit.local",
            "alex.t@toktickit.local",
            "admin@toktickit.local",
          ],
        },
      },
      data: {
        passwordHash: initialPasswordHash,
        mustChangePassword: false,
        isActive: true,
      },
    });

    // Login Admin
    adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "admin@toktickit.local", password: "Initial123!" });

    // Login Staff
    staffAgent = request.agent(app);
    await staffAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "alex.t@toktickit.local", password: "Initial123!" });

    // Login Requester
    requesterAgent = request.agent(app);
    await requesterAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "jennifer.a@toktickit.local", password: "Initial123!" });
  });

  afterAll(async () => {
    const prisma = getPrisma();
    // Restore sarah.j role to REQUESTER, reactivate admins, and clean up created test users
    await prisma.user.updateMany({
      where: { email: "sarah.j@toktickit.local" },
      data: { name: "Sarah Johnson", role: "REQUESTER" },
    });
    await prisma.user.updateMany({
      where: { role: "ADMINISTRATOR" },
      data: { isActive: true },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "new.testuser@toktickit.local",
            "edited.testuser@toktickit.local",
            "reset.testuser@toktickit.local",
          ],
        },
      },
    });
  });

  it("ADMIN-API-01: Admin user listing, search, and role filter (AC-18, AC-19)", async () => {
    // List all users
    const resAll = await adminAgent.get("/api/admin/users");
    expect(resAll.status).toBe(200);
    expect(Array.isArray(resAll.body)).toBe(true);
    expect(resAll.body.length).toBeGreaterThan(0);

    // Search by name
    const resSearch = await adminAgent.get("/api/admin/users?search=Jennifer");
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.some((u: any) => u.name.includes("Jennifer"))).toBe(true);

    // Filter by role
    const resRole = await adminAgent.get("/api/admin/users?role=IT_STAFF");
    expect(resRole.status).toBe(200);
    expect(resRole.body.every((u: any) => u.role === "IT_STAFF")).toBe(true);
  });

  it("ADMIN-API-02: Admin user creation with initial password (AC-20, BR-08)", async () => {
    const res = await adminAgent
      .post("/api/admin/users")
      .set(CSRF_HEADER)
      .send({
        name: "New Test User",
        email: "new.testuser@toktickit.local",
        role: "REQUESTER",
        isActive: true,
        initialPassword: "Initial123!",
      });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("new.testuser@toktickit.local");
    expect(res.body.role).toBe("REQUESTER");
    expect(res.body.mustChangePassword).toBe(true);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("ADMIN-API-03: Duplicate email user creation rejection (AC-21, BR-07)", async () => {
    const res = await adminAgent
      .post("/api/admin/users")
      .set(CSRF_HEADER)
      .send({
        name: "Duplicate User",
        email: "jennifer.a@toktickit.local", // Existing email
        role: "REQUESTER",
        isActive: true,
        initialPassword: "Initial123!",
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("ADMIN-API-04: Admin self-deactivation prevention (AC-22, BR-09)", async () => {
    const prisma = getPrisma();
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@toktickit.local" } });
    expect(adminUser).toBeDefined();

    const res = await adminAgent
      .patch(`/api/admin/users/${adminUser!.id}`)
      .set(CSRF_HEADER)
      .send({ isActive: false });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("deactivate your own account");
  });

  it("ADMIN-API-05: Deactivation prevention of last active Administrator (AC-23, BR-10)", async () => {
    const prisma = getPrisma();
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@toktickit.local" } });
    expect(adminUser).toBeDefined();

    // Ensure only 1 active admin in system
    await prisma.user.updateMany({
      where: { role: "ADMINISTRATOR", id: { not: adminUser!.id } },
      data: { isActive: false },
    });

    // Attempt to demote last active admin to IT_STAFF
    const demoteRes = await adminAgent
      .patch(`/api/admin/users/${adminUser!.id}`)
      .set(CSRF_HEADER)
      .send({ role: "IT_STAFF" });

    expect(demoteRes.status).toBe(400);
    expect(demoteRes.body.message).toContain("only active Administrator");
  });

  it("ADMIN-API-06: Admin reset initial password for user (AC-24, BR-08)", async () => {
    const prisma = getPrisma();
    const targetUser = await prisma.user.findFirst({ where: { email: "jennifer.a@toktickit.local" } });
    expect(targetUser).toBeDefined();

    const res = await adminAgent
      .post(`/api/admin/users/${targetUser!.id}/reset-password`)
      .set(CSRF_HEADER)
      .send({ initialPassword: "NewInitial123!" });

    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
  });

  it("ADMIN-API-07: Admin user editing and single role enforcement (FR-20, BR-06)", async () => {
    const prisma = getPrisma();
    const targetUser = await prisma.user.findFirst({ where: { email: "sarah.j@toktickit.local" } });
    expect(targetUser).toBeDefined();

    const res = await adminAgent
      .patch(`/api/admin/users/${targetUser!.id}`)
      .set(CSRF_HEADER)
      .send({ name: "Sarah Johnson Updated", role: "IT_STAFF" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Sarah Johnson Updated");
    expect(res.body.role).toBe("IT_STAFF");
  });

  it("SEC-API-02: Requester and IT Staff forbidden from Admin endpoints (AC-25)", async () => {
    const reqRes = await requesterAgent.get("/api/admin/users");
    expect(reqRes.status).toBe(403);

    const staffRes = await staffAgent.get("/api/admin/users");
    expect(staffRes.status).toBe(403);
  });
});
