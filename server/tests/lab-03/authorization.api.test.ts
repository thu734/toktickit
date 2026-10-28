import { startTestServer } from "../testHttpServer.js";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" };

describe("Lab 3 Server Authorization Tests (SEC-API-01, SEC-API-02, SEC-API-04)", () => {
  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.user.update({ where: { email: "alex.t@toktickit.local" }, data: { role: "IT_STAFF" } });
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
    await prisma.user.update({ where: { email: "alex.t@toktickit.local" }, data: { role: "IT_STAFF", isActive: true } });
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


  it.each([
    { url: "/api/tickets", email: "jennifer.a@toktickit.local" },
    { url: "/api/staff/tickets", email: "alex.t@toktickit.local" },
    { url: "/api/admin/users", email: "admin@toktickit.local" },
    { url: "/api/tickets/1/comments", email: "jennifer.a@toktickit.local" },
  ])(
    "rejects legacy identity headers without authentication on $url", async ({ url, email }) => {
      const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
      const res = await request(await startTestServer(app)).get(url).set("X-Development-Requester-Id", String(user.id));
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHENTICATED");
    }
  );

  it("ignores an identity header supplied alongside an authenticated session", async () => {
    const agent = request.agent(await startTestServer(app));
    await agent.post("/api/auth/login").set(CSRF_HEADER)
      .send({ email: "jennifer.a@toktickit.local", password: "Initial123!" }).expect(200);
    const admin = await getPrisma().user.findUniqueOrThrow({ where: { email: "admin@toktickit.local" } });
    await agent.get("/api/admin/users").set("X-Development-Requester-Id", String(admin.id)).expect(403);
    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body.user.email).toBe("jennifer.a@toktickit.local");
  });

  it.each([
    { change: { isActive: false }, expected: 401, name: "deactivation" },
    { change: { role: "REQUESTER" as const }, expected: 403, name: "demotion" },
  ])("enforces current Staff account permissions after $name", async ({ change, expected }) => {
    const staff = await getPrisma().user.findUniqueOrThrow({ where: { email: "alex.t@toktickit.local" } });
    const staffAgent = request.agent(await startTestServer(app));
    const adminAgent = request.agent(await startTestServer(app));
    await staffAgent.post("/api/auth/login").set(CSRF_HEADER)
      .send({ email: staff.email, password: "Initial123!" }).expect(200);
    await adminAgent.post("/api/auth/login").set(CSRF_HEADER)
      .send({ email: "admin@toktickit.local", password: "Initial123!" }).expect(200);
    await staffAgent.get("/api/staff/tickets").expect(200);
    await adminAgent.patch(`/api/admin/users/${staff.id}`).set(CSRF_HEADER).send(change).expect(200);
    await staffAgent.get("/api/staff/tickets").expect(expected);
    await staffAgent.get("/api/staff/tickets/1/notes").expect(expected);
    if (expected === 401) {
      await staffAgent.get("/api/tickets/1/comments").expect(401);
    } else {
      await staffAgent.get("/api/tickets").expect(200);
    }
  });

  it("SEC-API-04: Unauthenticated access returns HTTP 401 Unauthorized", async () => {
    const res = await request(await startTestServer(app)).get("/api/tickets");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });


  it("SEC-API-02: Role violation returns HTTP 403 Forbidden for non-Requester role", async () => {
    const agent = request.agent(await startTestServer(app));

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
    const agent = request.agent(await startTestServer(app));

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
    const agent = request.agent(await startTestServer(app));

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
