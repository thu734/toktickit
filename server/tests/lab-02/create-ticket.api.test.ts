import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

afterAll(async () => {
  await getPrisma().$disconnect();
});

describe("Lab 2 Reference Data APIs & Requester Exclusion (API-11)", () => {
  it("GET /api/requesters returns 200 with only active requesters (excludes inactive)", async () => {
    const res = await request(app).get("/api/requesters");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Verify all returned requesters are active
    const inactiveFound = res.body.some(
      (r: { name: string; isActive?: boolean }) => r.name === "Robert Smith"
    );
    expect(inactiveFound).toBe(false);

    // Verify active requesters are present
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
