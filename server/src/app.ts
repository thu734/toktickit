import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { generateNextTicketNumber } from "./utils/ticketNumber.js";
import { RequestedPriority } from "@prisma/client";

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
    // 1. Validate X-Development-Requester-Id header (BR-05)
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

    // Verify requester exists and is active (BR-04)
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

    // 2. Extract and Trim Inputs (BR-08)
    let { categoryId, relatedSystemId, requestedPriority, summary, description } = req.body;

    summary = typeof summary === "string" ? summary.trim() : "";
    description = typeof description === "string" ? description.trim() : "";

    const validationErrors: Record<string, string> = {};

    // Validate Summary (BR-09)
    if (!summary || summary.length < 5 || summary.length > 150) {
      validationErrors.summary = "Ticket Summary is required and must be between 5 and 150 characters.";
    }

    // Validate Description (BR-10)
    if (!description || description.length < 10 || description.length > 3000) {
      validationErrors.description = "Description is required and must be between 10 and 3000 characters.";
    }

    // Validate Requested Priority Enum (BR-12)
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (!requestedPriority || !validPriorities.includes(requestedPriority)) {
      validationErrors.requestedPriority = "Requested Priority must be one of: LOW, MEDIUM, HIGH, URGENT.";
    }

    // Validate Category ID & Active Status (BR-11)
    const catIdNum = Number(categoryId);
    if (!catIdNum || isNaN(catIdNum)) {
      validationErrors.categoryId = "Valid Category ID is required.";
    } else {
      const category = await getPrisma().category.findUnique({ where: { id: catIdNum } });
      if (!category || !category.isActive) {
        validationErrors.categoryId = "Selected Category does not exist or is inactive.";
      }
    }

    // Validate Related System ID & Active Status (BR-11)
    const sysIdNum = Number(relatedSystemId);
    if (!sysIdNum || isNaN(sysIdNum)) {
      validationErrors.relatedSystemId = "Valid Related System ID is required.";
    } else {
      const system = await getPrisma().relatedSystem.findUnique({ where: { id: sysIdNum } });
      if (!system || !system.isActive) {
        validationErrors.relatedSystemId = "Selected Related System does not exist or is inactive.";
      }
    }

    // Return 400 Bad Request if validation failed (AC-23)
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Validation failed for ticket creation.",
        details: validationErrors,
      });
    }

    // 3. Generate Official Ticket Number (BR-01)
    const ticketNumber = await generateNextTicketNumber();

    // 4. Create Ticket Record in Database (BR-02, BR-07)
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

export default app;
