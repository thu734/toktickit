import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { generateNextTicketNumber } from "./utils/ticketNumber.js";
import { RequestedPriority, TicketStatus, Prisma } from "@prisma/client";

export const app = express();

app.use(cors());
app.use(express.json());

// GET /api/health
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// GET /api/categories (Active categories)
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(categories.map((c) => ({ id: c.id, name: c.name })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/requesters (Active Development Requesters - BR-04, AC-13)
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().developmentRequester.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
    });
    res.status(200).json(requesters);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch development requesters" });
  }
});

// GET /api/related-systems (Active Related Systems)
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
      },
    });
    res.status(200).json(systems);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch related systems" });
  }
});

// POST /api/tickets (Create Ticket - FR-04, FR-05, FR-06, BR-01, BR-02, BR-07..BR-12, AC-01, AC-23)
app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const requesterHeader = req.headers["x-development-requester-id"];
    if (!requesterHeader || typeof requesterHeader !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "X-Development-Requester-Id header is required.",
      });
    }

    const requesterId = parseInt(requesterHeader, 10);
    if (isNaN(requesterId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid X-Development-Requester-Id header format.",
      });
    }

    const requester = await getPrisma().developmentRequester.findUnique({
      where: { id: requesterId },
    });

    if (!requester) {
      return res.status(404).json({
        error: "Not Found",
        message: "Development Requester does not exist.",
      });
    }

    if (!requester.isActive) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Inactive Development Requesters cannot create tickets.",
      });
    }

    let { categoryId, relatedSystemId, requestedPriority, summary, description } = req.body;

    summary = typeof summary === "string" ? summary.trim() : "";
    description = typeof description === "string" ? description.trim() : "";

    const validationErrors: Record<string, string> = {};

    if (!summary || summary.length < 5 || summary.length > 150) {
      validationErrors.summary = "Ticket Summary is required and must be between 5 and 150 characters.";
    }

    if (!description || description.length < 10 || description.length > 3000) {
      validationErrors.description = "Description is required and must be between 10 and 3000 characters.";
    }

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (!requestedPriority || !validPriorities.includes(requestedPriority)) {
      validationErrors.requestedPriority = "Requested Priority must be one of: LOW, MEDIUM, HIGH, URGENT.";
    }

    const catIdNum = Number(categoryId);
    if (!catIdNum || isNaN(catIdNum)) {
      validationErrors.categoryId = "Valid Category ID is required.";
    } else {
      const category = await getPrisma().category.findUnique({ where: { id: catIdNum } });
      if (!category || !category.isActive) {
        validationErrors.categoryId = "Selected Category does not exist or is inactive.";
      }
    }

    const sysIdNum = Number(relatedSystemId);
    if (!sysIdNum || isNaN(sysIdNum)) {
      validationErrors.relatedSystemId = "Valid Related System ID is required.";
    } else {
      const system = await getPrisma().relatedSystem.findUnique({ where: { id: sysIdNum } });
      if (!system || !system.isActive) {
        validationErrors.relatedSystemId = "Selected Related System does not exist or is inactive.";
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Validation failed for ticket creation.",
        details: validationErrors,
      });
    }

    const ticketNumber = await generateNextTicketNumber();

    const newTicket = await getPrisma().ticket.create({
      data: {
        ticketNumber,
        summary,
        description,
        requestedPriority: requestedPriority as RequestedPriority,
        itPriority: "UNASSIGNED",
        currentStatus: "NEW",
        requesterId,
        categoryId: catIdNum,
        relatedSystemId: sysIdNum,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(newTicket);
  } catch (error) {
    console.error("Error creating ticket:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while creating the ticket.",
    });
  }
});

// GET /api/tickets (Paginated Ticket Listing, Search, Filter, Sort & Ownership - FR-07..FR-10, BR-06, BR-23..BR-25, AC-09, AC-10, AC-19, AC-20)
app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    // 1. Validate X-Development-Requester-Id header & ownership (BR-06)
    const requesterHeader = req.headers["x-development-requester-id"];
    if (!requesterHeader || typeof requesterHeader !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "X-Development-Requester-Id header is required.",
      });
    }

    const requesterId = parseInt(requesterHeader, 10);
    if (isNaN(requesterId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid X-Development-Requester-Id header format.",
      });
    }

    const requester = await getPrisma().developmentRequester.findUnique({
      where: { id: requesterId },
    });

    if (!requester) {
      return res.status(404).json({
        error: "Not Found",
        message: "Development Requester does not exist.",
      });
    }

    if (!requester.isActive) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Inactive Development Requesters cannot access tickets.",
      });
    }

    // 2. Parse Query Parameters
    const {
      search,
      categoryId,
      requestedPriority,
      currentStatus,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      limit = "10",
    } = req.query;

    // Validate Sort Parameters (FR-10)
    const allowedSortFields = ["createdAt", "updatedAt", "ticketNumber", "requestedPriority"];
    if (typeof sortBy !== "string" || !allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        error: "Bad Request",
        message: `Invalid sortBy field. Allowed fields: ${allowedSortFields.join(", ")}.`,
      });
    }

    const sortDir = sortOrder === "asc" ? "asc" : "desc";

    // Validate Pagination Boundaries (BR-23)
    let pageNum = parseInt(String(page), 10);
    let limitNum = parseInt(String(limit), 10);

    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;
    if (limitNum > 50) limitNum = 50; // Cap max limit at 50

    // 3. Build Prisma Where Clause (BR-06 Ownership Isolation)
    const whereClause: Prisma.TicketWhereInput = {
      requesterId, // Strict ownership filter
    };

    // Case-Insensitive Search across ticketNumber, summary, description (BR-24, AC-10)
    if (typeof search === "string" && search.trim() !== "") {
      const searchTerm = search.trim();
      whereClause.OR = [
        { ticketNumber: { contains: searchTerm, mode: "insensitive" } },
        { summary: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Multi-Field Filtering (FR-09, AC-19)
    if (categoryId) {
      const catId = Number(categoryId);
      if (!isNaN(catId)) whereClause.categoryId = catId;
    }

    if (typeof requestedPriority === "string" && requestedPriority !== "ALL") {
      whereClause.requestedPriority = requestedPriority as RequestedPriority;
    }

    if (typeof currentStatus === "string" && currentStatus !== "ALL") {
      whereClause.currentStatus = currentStatus as TicketStatus;
    }

    // 4. Query Total Items & Paginated Record Set
    const totalItems = await getPrisma().ticket.count({ where: whereClause });
    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    // Build OrderBy array with tie-breaker sort
    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      { [sortBy]: sortDir },
      { id: "desc" }, // Secondary sort for deterministic order
    ];

    const items = await getPrisma().ticket.findMany({
      where: whereClause,
      orderBy,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
      },
    });

    // 5. Return 1-Indexed Pagination Metadata Response (BR-23, AC-09)
    return res.status(200).json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while fetching tickets.",
    });
  }
});

export default app;
