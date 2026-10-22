import { loginAsUser } from "../helpers/login.js";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 Ticket Detail API - Owned Retrieval & Cross-Requester Security (API-05, API-05A)", () => {
  let requester1Id: number;
  let requester1Agent: Awaited<ReturnType<typeof loginAsUser>>;
  let requester2Id: number;
  let requester2Agent: Awaited<ReturnType<typeof loginAsUser>>;
  let ticket1Id: number;

  beforeEach(async () => {
    const prisma = getPrisma();

    // Get seeded active requesters
    const requesters = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER" },
      orderBy: { id: "asc" },
    });
    requester1Id = requesters[0].id;
    requester1Agent = await loginAsUser(requester1Id);
    requester2Id = requesters[1].id;
    requester2Agent = await loginAsUser(requester2Id);

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
        itPriority: "MEDIUM",
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
    const res = await requester1Agent
      .get(`/api/tickets/${ticket1Id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticket1Id);
    expect(res.body.ticketNumber).toBe("TKT-2026-000099");
    expect(res.body.summary).toBe("Monitor display issues");
    expect(res.body.itPriority).toBe("MEDIUM");
    expect(res.body.requester.id).toBe(requester1Id);
    expect(res.body.category.name).toBeDefined();
    expect(res.body.relatedSystem.name).toBeDefined();
  });

  it("GET /api/tickets/:id returns HTTP 404 Not Found for cross-requester detail access (effective Lab 3 BR-16) (API-05, AC-03, BR-06)", async () => {
    const res = await requester2Agent
      .get(`/api/tickets/${ticket1Id}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not Found");
  });

  it("GET /api/tickets/:id returns HTTP 404 Not Found for non-existent ticket ID", async () => {
    const res = await requester1Agent
      .get("/api/tickets/999999");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not Found");
  });
});
