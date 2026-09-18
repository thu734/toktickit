import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" };

describe("Lab 3 Server Authorization Tests (SEC-API-01, SEC-API-02, SEC-API-04)", () => {
  beforeEach(async () => {
    const prisma = getPrisma();
    const initialPasswordHash = await bcrypt.hash("Initial123!", 10);
    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "jennifer.a@toktickit.local",
            "michael.b@toktickit.local",
            "alex.t@toktickit.local",
            "admin@toktickit.local",
          ],
        },
      },
      data: {
        passwordHash: initialPasswordHash,
        mustChangePassword: false, // Unlocked for authorization testing
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "jennifer.a@toktickit.local",
            "michael.b@toktickit.local",
            "alex.t@toktickit.local",
            "admin@toktickit.local",
          ],
        },
      },
      data: {
        mustChangePassword: true,
      },
    });
  });


  it("SEC-API-04: Unauthenticated access returns HTTP 401 Unauthorized", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });


  it("SEC-API-02: Role violation returns HTTP 403 Forbidden for non-Requester role", async () => {
    const agent = request.agent(app);

    // Login as IT Staff
    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "alex.t@toktickit.local",
        password: "Initial123!",
      })
      .expect(200);

    // IT Staff calling Requester workspace endpoint returns HTTP 403 Forbidden
    const res = await agent.get("/api/tickets");
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("SEC-API-01: Authenticated Requester can access Requester workspace", async () => {
    const agent = request.agent(app);

    // Login as Requester
    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "jennifer.a@toktickit.local",
        password: "Initial123!",
      })
      .expect(200);

    // Requester calling Requester workspace endpoint succeeds (200 OK)
    const res = await agent.get("/api/tickets");
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
  });

  it("SEC-API-04: Reference data endpoints permit all authenticated roles", async () => {
    const agent = request.agent(app);

    // Login as Admin
    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "admin@toktickit.local",
        password: "Initial123!",
      })
      .expect(200);

    // Admin can access reference data
    const catRes = await agent.get("/api/categories");
    expect(catRes.status).toBe(200);

    const sysRes = await agent.get("/api/related-systems");
    expect(sysRes.status).toBe(200);
  });
});
