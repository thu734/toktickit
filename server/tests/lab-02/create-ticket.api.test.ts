import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

afterAll(async () => {
  // Clean up tickets created during test
  await getPrisma().ticket.deleteMany({
    where: {
      summary: {
        in: ["Cannot access email account", "Valid summary text"],
      },
    },
  });
  await getPrisma().$disconnect();
});

describe("Lab 2 Reference Data APIs & Requester Exclusion (API-11)", () => {
  it("GET /api/requesters returns 200 with only active requesters (excludes inactive)", async () => {
    const res = await request(app).get("/api/requesters");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const inactiveFound = res.body.some(
      (r: { name: string; isActive?: boolean }) => r.name === "Robert Smith"
    );
    expect(inactiveFound).toBe(false);

    const names = res.body.map((r: { name: string }) => r.name);
    expect(names).toContain("Jennifer Anderson");
    expect(names).toContain("Michael Brown");
  });

  it("GET /api/related-systems returns 200 with active related systems", async () => {
    const res = await request(app).get("/api/related-systems");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(7);

    const names = res.body.map((s: { name: string }) => s.name);
    expect(names).toContain("Email");
    expect(names).toContain("Corporate Laptop");
  });
});

describe("POST /api/tickets Creation & Validation (API-01, API-02)", () => {
  it("POST /api/tickets creates a valid ticket with official Ticket Number (API-01, AC-01)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", "1")
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "HIGH",
        summary: "Cannot access email account",
        description: "Password reset link is not being sent to my phone number.",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.itPriority).toBe("UNASSIGNED");
    expect(res.body.requesterId).toBe(1);
    expect(res.body.summary).toBe("Cannot access email account");
  });

  it("POST /api/tickets rejects invalid payload and missing headers (API-02, AC-23)", async () => {
    // 1. Missing header -> 400 Bad Request
    const resNoHeader = await request(app)
      .post("/api/tickets")
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "Valid summary text",
        description: "Valid description text here",
      });
    expect(resNoHeader.status).toBe(400);

    // 2. Summary too short (< 5 chars) -> 400 Bad Request
    const resShortSummary = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", "1")
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "Tiny",
        description: "Valid description text here",
      });
    expect(resShortSummary.status).toBe(400);
    expect(resShortSummary.body.details).toBeDefined();

    // 3. Description too short (< 10 chars) -> 400 Bad Request
    const resShortDesc = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", "1")
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "Valid summary text",
        description: "Short",
      });
    expect(resShortDesc.status).toBe(400);

    // 4. Invalid priority enum -> 400 Bad Request
    const resInvalidPriority = await request(app)
      .post("/api/tickets")
      .set("X-Development-Requester-Id", "1")
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "SUPER_URGENT",
        summary: "Valid summary text",
        description: "Valid description text here",
      });
    expect(resInvalidPriority.status).toBe(400);
  });
});
