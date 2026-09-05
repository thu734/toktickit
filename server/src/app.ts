import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { getPrisma } from "./prisma.js";
import { generateNextTicketNumber } from "./utils/ticketNumber.js";
import { RequestedPriority, TicketStatus, Prisma } from "@prisma/client";
import { upload } from "./middleware/upload.js";

export const app = express();

app.use(cors());
app.use(express.json());

// Helper function to extract and validate Development Requester identity header (BR-05, BR-06)
async function getValidatedRequester(req: Request, res: Response): Promise<number | null> {
  const requesterHeader = req.headers["x-development-requester-id"];
  if (!requesterHeader || typeof requesterHeader !== "string") {
    res.status(400).json({
      error: "Bad Request",
      message: "X-Development-Requester-Id header is required.",
    });
    return null;
  }

  const requesterId = parseInt(requesterHeader, 10);
  if (isNaN(requesterId)) {
    res.status(400).json({
      error: "Bad Request",
      message: "Invalid X-Development-Requester-Id header format.",
    });
    return null;
  }

  const requester = await getPrisma().developmentRequester.findUnique({
    where: { id: requesterId },
  });

  if (!requester) {
    res.status(404).json({
      error: "Not Found",
      message: "Development Requester does not exist.",
    });
    return null;
  }

  if (!requester.isActive) {
    res.status(403).json({
      error: "Forbidden",
      message: "Inactive Development Requesters cannot access tickets.",
    });
    return null;
  }

  return requesterId;
}

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
    const requesterId = await getValidatedRequester(req, res);
    if (requesterId === null) return;

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
    const requesterId = await getValidatedRequester(req, res);
    if (requesterId === null) return;

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

    const allowedSortFields = ["createdAt", "updatedAt", "ticketNumber", "requestedPriority"];
    if (typeof sortBy !== "string" || !allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        error: "Bad Request",
        message: `Invalid sortBy field. Allowed fields: ${allowedSortFields.join(", ")}.`,
      });
    }

    const sortDir = sortOrder === "asc" ? "asc" : "desc";

    let pageNum = parseInt(String(page), 10);
    let limitNum = parseInt(String(limit), 10);

    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;
    if (limitNum > 50) limitNum = 50;

    const whereClause: Prisma.TicketWhereInput = {
      requesterId,
    };

    if (typeof search === "string" && search.trim() !== "") {
      const searchTerm = search.trim();
      whereClause.OR = [
        { ticketNumber: { contains: searchTerm, mode: "insensitive" } },
        { summary: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

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

    const totalItems = await getPrisma().ticket.count({ where: whereClause });
    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      { [sortBy]: sortDir },
      { id: "desc" },
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

// GET /api/tickets/:id (Get Owned Ticket Detail - FR-11, BR-06, AC-03, AC-22)
app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    const requesterId = await getValidatedRequester(req, res);
    if (requesterId === null) return;

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid ticket ID format.",
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true, department: true } },
        attachments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            filename: true,
            mimeType: true,
            fileSize: true,
            isRemoved: true,
            removedAt: true,
            removalReason: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Not Found",
        message: "Ticket not found.",
      });
    }

    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access this ticket.",
      });
    }

    return res.status(200).json(ticket);
  } catch (error) {
    console.error("Error fetching ticket detail:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while fetching ticket detail.",
    });
  }
});

// POST /api/tickets/:id/attachments (Upload Attachment - FR-12, FR-13, FR-14, BR-06, BR-15..BR-18, BR-22, AC-04..AC-06)
app.post("/api/tickets/:id/attachments", (req: Request, res: Response) => {
  upload.single("file")(req, res, async (err: any) => {
    const cleanupFile = async () => {
      if (req.file && req.file.path) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
    };

    if (err) {
      await cleanupFile();
      return res.status(400).json({
        error: "Bad Request",
        message: err.message || "File upload validation failed.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "Bad Request",
        message: "No attachment file provided.",
      });
    }

    try {
      const requesterId = await getValidatedRequester(req, res);
      if (requesterId === null) {
        await cleanupFile();
        return;
      }

      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId)) {
        await cleanupFile();
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid ticket ID format.",
        });
      }

      const ticket = await getPrisma().ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        await cleanupFile();
        return res.status(404).json({
          error: "Not Found",
          message: "Ticket not found.",
        });
      }

      if (ticket.requesterId !== requesterId) {
        await cleanupFile();
        return res.status(403).json({
          error: "Forbidden",
          message: "You do not have permission to upload attachments to this ticket.",
        });
      }

      const activeAttachmentsCount = await getPrisma().attachment.count({
        where: { ticketId, isRemoved: false },
      });

      if (activeAttachmentsCount >= 5) {
        await cleanupFile();
        return res.status(400).json({
          error: "Bad Request",
          message: "Maximum active attachment limit (5) reached for this ticket.",
        });
      }

      const attachment = await getPrisma().attachment.create({
        data: {
          ticketId,
          filename: req.file.originalname,
          storedFilename: req.file.filename,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          filePath: req.file.path,
        },
      });

      return res.status(201).json(attachment);
    } catch (error) {
      await cleanupFile();
      console.error("Error creating attachment:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to upload attachment.",
      });
    }
  });
});

// GET /api/tickets/:id/attachments (List Ticket Attachments Metadata - BR-06)
app.get("/api/tickets/:id/attachments", async (req: Request, res: Response) => {
  try {
    const requesterId = await getValidatedRequester(req, res);
    if (requesterId === null) return;

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid ticket ID format.",
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Not Found",
        message: "Ticket not found.",
      });
    }

    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access attachments for this ticket.",
      });
    }

    const attachments = await getPrisma().attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        isRemoved: true,
        removedAt: true,
        removalReason: true,
        createdAt: true,
      },
    });

    return res.status(200).json(attachments);
  } catch (error) {
    console.error("Error fetching ticket attachments:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while fetching attachments.",
    });
  }
});

// GET /api/attachments/:id/download (Download Active Attachment Stream - FR-15, BR-06, BR-21, AC-08)
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  try {
    const requesterId = await getValidatedRequester(req, res);
    if (requesterId === null) return;

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid attachment ID format.",
      });
    }

    const attachment = await getPrisma().attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({
        error: "Not Found",
        message: "Attachment not found.",
      });
    }

    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to download this attachment.",
      });
    }

    if (attachment.isRemoved) {
      return res.status(410).json({
        error: "Gone",
        message: "This attachment was soft-removed and can no longer be downloaded.",
      });
    }

    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({
        error: "Not Found",
        message: "Attachment file missing from storage.",
      });
    }

    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.filename)}"`
    );

    return res.sendFile(path.resolve(attachment.filePath));
  } catch (error) {
    console.error("Error downloading attachment:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while downloading the attachment.",
    });
  }
});

// POST /api/attachments/:id/soft-remove (Soft-Remove Attachment - FR-16, FR-17, BR-06, BR-19, BR-20, AC-07)
app.post("/api/attachments/:id/soft-remove", async (req: Request, res: Response) => {
  try {
    const requesterId = await getValidatedRequester(req, res);
    if (requesterId === null) return;

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid attachment ID format.",
      });
    }

    const { removalReason } = req.body || {};
    const trimmedReason = typeof removalReason === "string" ? removalReason.trim() : "";

    if (!trimmedReason || trimmedReason.length < 5 || trimmedReason.length > 250) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Removal reason is required and must be between 5 and 250 characters.",
      });
    }

    const attachment = await getPrisma().attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({
        error: "Not Found",
        message: "Attachment not found.",
      });
    }

    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to remove this attachment.",
      });
    }

    const updated = await getPrisma().attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removalReason: trimmedReason,
        removedByRequesterId: requesterId,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Error soft-removing attachment:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while removing the attachment.",
    });
  }
});

export default app;
