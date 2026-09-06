import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 My Tickets API - Paginated Listing, Search, Filter, Sort & Ownership (API-03, API-04, API-13, API-14)", () => {
  let requester1Id: number;
  let requester2Id: number;
  let cat1Id: number;
  let cat2Id: number;
  let sys1Id: number;

  beforeEach(async () => {
    const prisma = getPrisma();

    // Get seeded active requesters
    const requesters = await prisma.developmentRequester.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    requester1Id = requesters[0].id; // Jennifer Anderson
    requester2Id = requesters[1].id; // Michael Brown

    // Get seeded categories & systems
    const categories = await prisma.category.findMany({ orderBy: { id: "asc" } });
    cat1Id = categories[0].id;
    cat2Id = categories[1].id;

    const systems = await prisma.relatedSystem.findMany({ orderBy: { id: "asc" } });
    sys1Id = systems[0].id;

    // Clean existing tickets before each test
    await prisma.ticket.deleteMany({});

    // Create tickets for Requester 1 (Jennifer)
    await prisma.ticket.createMany({
      data: [
        {
          ticketNumber: "TKT-2026-000001",
          summary: "VPN Connection drops frequently",
          description: "Connecting to campus VPN fails every 10 minutes.",
          requestedPriority: "HIGH",
          currentStatus: "NEW",
          itPriority: "UNASSIGNED",
          requesterId: requester1Id,
          categoryId: cat1Id,
          relatedSystemId: sys1Id,
          createdAt: new Date("2026-01-01T10:00:00Z"),
        },
        {
          ticketNumber: "TKT-2026-000002",
          summary: "Email account password reset",
          description: "Cannot reset email password on self-service portal.",
          requestedPriority: "MEDIUM",
          currentStatus: "NEW",
          itPriority: "UNASSIGNED",
          requesterId: requester1Id,
          categoryId: cat1Id,
          relatedSystemId: sys1Id,
          createdAt: new Date("2026-01-02T10:00:00Z"),
        },
        {
          ticketNumber: "TKT-2026-000003",
          summary: "Laptop screen flickering",
          description: "Display blinks when opening laptop lid.",
          requestedPriority: "URGENT",
          currentStatus: "OPEN",
          itPriority: "HIGH",
          requesterId: requester1Id,
          categoryId: cat2Id,
          relatedSystemId: sys1Id,
          createdAt: new Date("2026-01-03T10:00:00Z"),
        },
      ],
    });

    // Create tickets for Requester 2 (Michael) — Ownership Isolation Test
    await prisma.ticket.createMany({
      data: [
        {
          ticketNumber: "TKT-2026-000004",
          summary: "Printer toner replacement",
          description: "Department printer needs new black toner cartridge.",
          requestedPriority: "LOW",
          currentStatus: "NEW",
          itPriority: "UNASSIGNED",
          requesterId: requester2Id,
          categoryId: cat2Id,
          relatedSystemId: sys1Id,
          createdAt: new Date("2026-01-04T10:00:00Z"),
        },
      ],
    });
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("GET /api/tickets returns paginated listing with ownership isolation (API-03, AC-09, BR-06)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("X-Development-Requester-Id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.pagination.totalItems).toBe(3);

    // Verify ownership isolation: Requester 1 gets only 3 owned tickets, none of Requester 2's tickets
    const ticketNumbers = res.body.items.map((t: any) => t.ticketNumber);
    expect(ticketNumbers).toContain("TKT-2026-000001");
    expect(ticketNumbers).toContain("TKT-2026-000002");
    expect(ticketNumbers).toContain("TKT-2026-000003");
    expect(ticketNumbers).not.toContain("TKT-2026-000004");
  });

  it("GET /api/tickets performs case-insensitive search across summary and description (API-04, AC-10, BR-24)", async () => {
    const res = await request(app)
      .get("/api/tickets?search=email")
      .set("X-Development-Requester-Id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].ticketNumber).toBe("TKT-2026-000002");
  });

  it("GET /api/tickets applies multi-field filtering by Category, Priority, and Status (API-13, AC-19)", async () => {
    const res = await request(app)
      .get(`/api/tickets?categoryId=${cat2Id}&requestedPriority=URGENT&currentStatus=OPEN`)
      .set("X-Development-Requester-Id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].ticketNumber).toBe("TKT-2026-000003");
  });

  it("GET /api/tickets sorts tickets by allowed sort fields and orders (API-14, AC-20)", async () => {
    const resDesc = await request(app)
      .get("/api/tickets?sortBy=createdAt&sortOrder=desc")
      .set("X-Development-Requester-Id", String(requester1Id));

    expect(resDesc.status).toBe(200);
    expect(resDesc.body.items[0].ticketNumber).toBe("TKT-2026-000003");

    const resAsc = await request(app)
      .get("/api/tickets?sortBy=createdAt&sortOrder=asc")
      .set("X-Development-Requester-Id", String(requester1Id));

    expect(resAsc.status).toBe(200);
    expect(resAsc.body.items[0].ticketNumber).toBe("TKT-2026-000001");
  });

  it("GET /api/tickets validates requester context headers and invalid query params", async () => {
    // Missing header -> 400 Bad Request
    const resNoHeader = await request(app).get("/api/tickets");
    expect(resNoHeader.status).toBe(400);

    // Invalid sort field -> 400 Bad Request
    const resInvalidSort = await request(app)
      .get("/api/tickets?sortBy=invalidField")
      .set("X-Development-Requester-Id", String(requester1Id));
    expect(resInvalidSort.status).toBe(400);
  });
});
