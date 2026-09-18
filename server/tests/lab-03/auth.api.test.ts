import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" };

describe("Lab 3 Authentication & Session API Tests (AUTH-API-01 to AUTH-API-08)", () => {
  beforeEach(async () => {
    const prisma = getPrisma();
    const initialPasswordHash = await bcrypt.hash("Initial123!", 10);
    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "jennifer.a@toktickit.local",
            "michael.b@toktickit.local",
            "sarah.j@toktickit.local",
            "david.l@toktickit.local",
            "alex.t@toktickit.local",
            "admin@toktickit.local",
          ],
        },
      },
      data: {
        passwordHash: initialPasswordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });
  });

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

  it("AUTH-API-03: Mandatory first-login password change lock (mustChangePassword = true)", async () => {
    const agent = request.agent(app);

    // Login as user with mustChangePassword = true
    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "michael.b@toktickit.local",
        password: "Initial123!",
      })
      .expect(200);

    // Standard protected route returns 403 MUST_CHANGE_PASSWORD
    const lockedRes = await agent.get("/api/categories");
    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.code).toBe("MUST_CHANGE_PASSWORD");

    // Allowed endpoints remain accessible while locked
    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.mustChangePassword).toBe(true);
  });

  it("AUTH-API-04: Password change execution (POST /api/auth/change-password)", async () => {
    const agent = request.agent(app);

    // Login as Sarah Johnson
    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "sarah.j@toktickit.local",
        password: "Initial123!",
      })
      .expect(200);

    // Execute password change
    const changeRes = await agent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NewSecurePassword123!",
        confirmPassword: "NewSecurePassword123!",
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.mustChangePassword).toBe(false);

    // Verify GET /api/auth/me reflects mustChangePassword = false
    const meRes = await agent.get("/api/auth/me").expect(200);
    expect(meRes.body.user.mustChangePassword).toBe(false);

    // Verify route lock is unlocked and standard route /api/categories succeeds
    const catRes = await agent.get("/api/categories");
    expect(catRes.status).toBe(200);
  });

  it("AUTH-API-06: Password complexity boundary validation and error handling", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({
        email: "david.l@toktickit.local",
        password: "Initial123!",
      })
      .expect(200);

    // Password too short (<8 chars)
    const resShort = await agent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "Short1!",
        confirmPassword: "Short1!",
      });
    expect(resShort.status).toBe(400);
    expect(resShort.body.code).toBe("WEAK_PASSWORD");

    // Missing uppercase
    const resNoUpper = await agent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "nouppercase1!",
        confirmPassword: "nouppercase1!",
      });
    expect(resNoUpper.status).toBe(400);
    expect(resNoUpper.body.code).toBe("WEAK_PASSWORD");

    // Missing special character
    const resNoSpecial = await agent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NoSpecialChar123",
        confirmPassword: "NoSpecialChar123",
      });
    expect(resNoSpecial.status).toBe(400);
    expect(resNoSpecial.body.code).toBe("WEAK_PASSWORD");

    // Passwords mismatch
    const resMismatch = await agent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "ValidPassword123!",
        confirmPassword: "DifferentPassword123!",
      });
    expect(resMismatch.status).toBe(400);
    expect(resMismatch.body.code).toBe("PASSWORD_MISMATCH");

    // Incorrect current password
    const resWrongCurrent = await agent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "WrongCurrentPassword!",
        newPassword: "ValidPassword123!",
        confirmPassword: "ValidPassword123!",
      });
    expect(resWrongCurrent.status).toBe(400);
    expect(resWrongCurrent.body.code).toBe("INVALID_CURRENT_PASSWORD");
  });
});

