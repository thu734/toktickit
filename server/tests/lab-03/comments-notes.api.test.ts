import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" };

describe("Lab 3 Public Comments & Resolution Indication Tests (COMM-API-01 - COMM-API-04)", () => {
  let requesterAgent: any;
  let requesterId: number;
  let otherRequesterAgent: any;
  let otherRequesterId: number;
  let ticketId: number;

  beforeEach(async () => {
    const prisma = getPrisma();
    const initialPasswordHash = await bcrypt.hash("Initial123!", 10);

    // Reset password hashes & active status for test accounts
    await prisma.user.updateMany({
      where: {
        email: {
          in: ["jennifer.a@toktickit.local", "michael.b@toktickit.local"],
        },
      },
      data: {
        passwordHash: initialPasswordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });

    // Clean up test comments and tickets
    await prisma.comment.deleteMany({});
    await prisma.ticket.deleteMany({});

    // Authenticate Requester 1 (Jennifer Anderson) and complete mandatory password change
    requesterAgent = request.agent(app);
    const loginRes1 = await requesterAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "jennifer.a@toktickit.local", password: "Initial123!" });
    expect(loginRes1.status).toBe(200);
    requesterId = loginRes1.body.user.id;

    const changePw1 = await requesterAgent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });
    expect(changePw1.status).toBe(200);

    // Authenticate Requester 2 (Michael Brown) and complete mandatory password change
    otherRequesterAgent = request.agent(app);
    const loginRes2 = await otherRequesterAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "michael.b@toktickit.local", password: "Initial123!" });
    expect(loginRes2.status).toBe(200);
    otherRequesterId = loginRes2.body.user.id;

    const changePw2 = await otherRequesterAgent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });
    expect(changePw2.status).toBe(200);

    // Create ticket owned by Requester 1
    const ticketRes = await requesterAgent
      .post("/api/tickets")
      .set(CSRF_HEADER)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "Display flickering on external monitor",
        description: "Screen flickers when connected via HDMI cable.",
      });
    expect(ticketRes.status).toBe(201);
    ticketId = ticketRes.body.id;
  });

  // COMM-API-01: Public Comments retrieval and creation
  it("COMM-API-01: Authenticated Requester can post and list Public Comments on owned ticket", async () => {
    const postRes = await requesterAgent
      .post(`/api/tickets/${ticketId}/comments`)
      .set(CSRF_HEADER)
      .send({ content: "I checked the cable connection again." });

    expect(postRes.status).toBe(201);
    expect(postRes.body.content).toBe("I checked the cable connection again.");
    expect(postRes.body.author).toBeDefined();
    expect(postRes.body.author.id).toBe(requesterId);
    expect(postRes.body.author.role).toBe("REQUESTER");

    const getRes = await requesterAgent.get(`/api/tickets/${ticketId}/comments`);
    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.length).toBe(1);
    expect(getRes.body[0].content).toBe("I checked the cable connection again.");
  });

  // COMM-API-02: Requester "Problem Appears Resolved" indication
  it("COMM-API-02: Requester can submit Problem Appears Resolved indication without changing ticket status", async () => {
    const resolveRes = await requesterAgent
      .post(`/api/tickets/${ticketId}/indicate-resolved`)
      .set(CSRF_HEADER)
      .send({ comment: "The display issue stopped after updating the display driver." });

    // Exact HTTP 200 OK return status per api-spec.md Section 5.3
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.comment).toBeDefined();
    expect(resolveRes.body.comment.content).toBe("The display issue stopped after updating the display driver.");

    // Verify ticket status remains unchanged (BR-05)
    const ticketRes = await requesterAgent.get(`/api/tickets/${ticketId}`);
    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.currentStatus).toBe("NEW");
  });

  // COMM-API-03: Comment validation boundaries
  it("COMM-API-03: Rejects invalid or whitespace-only comments with HTTP 400 Bad Request", async () => {
    // Too short (< 3 chars)
    const shortRes = await requesterAgent
      .post(`/api/tickets/${ticketId}/comments`)
      .set(CSRF_HEADER)
      .send({ content: "hi" });
    expect(shortRes.status).toBe(400);

    // Whitespace only
    const spaceRes = await requesterAgent
      .post(`/api/tickets/${ticketId}/comments`)
      .set(CSRF_HEADER)
      .send({ content: "     " });
    expect(spaceRes.status).toBe(400);

    // Too long (> 1000 chars)
    const longRes = await requesterAgent
      .post(`/api/tickets/${ticketId}/comments`)
      .set(CSRF_HEADER)
      .send({ content: "a".repeat(1001) });
    expect(longRes.status).toBe(400);
  });

  // COMM-API-04: Backend-generated authorship and timestamp enforcement
  it("COMM-API-04: Overrides client-supplied authorId and timestamp with session identity and server time", async () => {
    const postRes = await requesterAgent
      .post(`/api/tickets/${ticketId}/comments`)
      .set(CSRF_HEADER)
      .send({
        content: "Attempting to spoof authorship",
        authorId: 999,
        createdAt: "2000-01-01T00:00:00.000Z",
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body.author.id).toBe(requesterId);
    expect(postRes.body.authorId).toBe(requesterId);
    expect(new Date(postRes.body.createdAt).getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  // Security test for BR-16: Unowned ticket comment access returns 404 Not Found
  it("BR-16: Fetching or posting comments for an unowned ticket returns HTTP 404 Not Found", async () => {
    const unownedGet = await otherRequesterAgent.get(`/api/tickets/${ticketId}/comments`);
    expect(unownedGet.status).toBe(404);

    const unownedPost = await otherRequesterAgent
      .post(`/api/tickets/${ticketId}/comments`)
      .set(CSRF_HEADER)
      .send({ content: "Unauthorized comment attempt" });
    expect(unownedPost.status).toBe(404);
  });
});
