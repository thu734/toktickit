import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" };

describe("Lab 3 Authentication & Session API Tests (AUTH-API-01 to AUTH-API-08)", () => {
  it("AUTH-API-01: Valid login sets session cookie and returns user profile", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "jennifer.a@toktickit.local",
        password: "Initial123!",
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("jennifer.a@toktickit.local");
    expect(res.body.user.role).toBe("REQUESTER");
    expect(res.body.user.mustChangePassword).toBe(true);

    const cookies = res.get("Set-Cookie");
    expect(cookies).toBeDefined();
    expect(cookies?.some((c: string) => c.includes("toktickit_session"))).toBe(true);
  });

  it("AUTH-API-02: Invalid credentials or inactive user login rejection", async () => {
    // Non-existent user
    const res1 = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "nonexistent@toktickit.local",
        password: "Initial123!",
      });
    expect(res1.status).toBe(401);
    expect(res1.body.error).toBe("Invalid email or password.");

    // Wrong password
    const res2 = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "jennifer.a@toktickit.local",
        password: "WrongPassword123!",
      });
    expect(res2.status).toBe(401);
    expect(res2.body.error).toBe("Invalid email or password.");

    // Inactive user account (BR-01, AC-02)
    const res3 = await request(app)
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "inactive.req@toktickit.local",
        password: "Initial123!",
      });
    expect(res3.status).toBe(401);
    expect(res3.body.error).toBe("Invalid email or password.");
  });

  it("AUTH-API-07: Current user retrieval (GET /api/auth/me)", async () => {
    const agent = request.agent(app);

    // Login first
    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "admin@toktickit.local",
        password: "Initial123!",
      })
      .expect(200);

    // Fetch me
    const meRes = await agent.get("/api/auth/me").expect(200);
    expect(meRes.body.user).toBeDefined();
    expect(meRes.body.user.email).toBe("admin@toktickit.local");
    expect(meRes.body.user.role).toBe("ADMINISTRATOR");
  });

  it("AUTH-API-05 & AUTH-API-08: Logout invalidates session and blocks post-logout me retrieval", async () => {
    const agent = request.agent(app);

    // Login
    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "alex.t@toktickit.local",
        password: "Initial123!",
      })
      .expect(200);

    // Logout
    const logoutRes = await agent
      .post("/api/auth/logout")
      .set(CSRF_HEADER)
      .expect(200);

    expect(logoutRes.body.message).toBe("Logged out successfully");

    // Post-logout me request fails with 401 (AUTH-API-08)
    const postLogoutMe = await agent.get("/api/auth/me");
    expect(postLogoutMe.status).toBe(401);
  });

  it("CSRF Protection: Mutating POST request without X-Requested-With header fails", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "jennifer.a@toktickit.local",
        password: "Initial123!",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("CSRF_HEADER_MISSING");
  });
});
