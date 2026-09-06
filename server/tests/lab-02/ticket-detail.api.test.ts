import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 Ticket Detail API - Owned Retrieval & Cross-Requester Security (API-05, API-05A)", () => {
  let requester1Id: number;
  let requester2Id: number;
  let ticket1Id: number;

  beforeEach(async () => {
    const prisma = getPrisma();

    // Get seeded active requesters
    const requesters = await prisma.developmentRequester.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    requester1Id = requesters[0].id;
    requester2Id = requesters[1].id;

    // Get seeded categories & systems
    const cat = await prisma.category.findFirst({ where: { isActive: true } });
    const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Clean existing attachments & tickets
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});

    // Create a ticket for Requester 1
    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000099",
        summary: "Monitor display issues",
        description: "External monitor goes black randomly.",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
        itPriority: "UNASSIGNED",
        requesterId: requester1Id,
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
      },
    });
    ticket1Id = t1.id;
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("GET /api/tickets/:id returns full ticket detail for owned ticket (API-05A, AC-22)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticket1Id}`)
      .set("X-Development-Requester-Id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticket1Id);
    expect(res.body.ticketNumber).toBe("TKT-2026-000099");
    expect(res.body.summary).toBe("Monitor display issues");
    expect(res.body.itPriority).toBe("UNASSIGNED");
    expect(res.body.requester.id).toBe(requester1Id);
    expect(res.body.category.name).toBeDefined();
    expect(res.body.relatedSystem.name).toBeDefined();
  });

  it("GET /api/tickets/:id returns HTTP 403 Forbidden for cross-requester detail access (API-05, AC-03, BR-06)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticket1Id}`)
      .set("X-Development-Requester-Id", String(requester2Id));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  it("GET /api/tickets/:id returns HTTP 404 Not Found for non-existent ticket ID", async () => {
    const res = await request(app)
      .get("/api/tickets/999999")
      .set("X-Development-Requester-Id", String(requester1Id));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not Found");
  });
});
