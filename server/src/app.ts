import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import session from "express-session";
import { getPrisma } from "./prisma.js";
import { generateNextTicketNumber } from "./utils/ticketNumber.js";
import { RequestedPriority, TicketStatus, Prisma } from "@prisma/client";
import { upload } from "./middleware/upload.js";
import { csrfProtection } from "./middleware/csrf.js";
import { mustChangePasswordLock } from "./middleware/mustChangePasswordLock.js";
import { syncHeaderSessionMiddleware, requireAuth, requireRole } from "./middleware/authorization.js";
import { authRouter } from "./routes/auth.js";
import { isValidStatusTransition } from "./utils/statusTransition.js";


export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, postman, mobile) or local dev origins
      if (!origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.use(
  session({
    name: "toktickit_session",
    secret: process.env.SESSION_SECRET || "toktickit-dev-session-secret-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  })
);

app.use(csrfProtection);
app.use("/api/auth", authRouter);
app.use(mustChangePasswordLock);


// Helper function to extract and validate Requester identity strictly from authenticated session (BR-03, FR-08)
async function getValidatedRequester(req: Request, res: Response): Promise<number | null> {
  if (!req.session?.userId) {
    res.status(401).json({
      error: "Authentication required. Please log in.",
      code: "UNAUTHENTICATED",
    });
    return null;
  }

  const user = await getPrisma().user.findUnique({
    where: { id: req.session.userId },
  });

  if (!user || !user.isActive) {
    res.status(401).json({
      error: "User session is invalid or inactive.",
      code: "UNAUTHENTICATED",
    });
    return null;
  }

  return user.id;
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

// GET /api/requesters (Active Requesters)
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().user.findMany({
      where: { isActive: true, role: "REQUESTER" },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
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


// POST /api/tickets (Create Ticket - requireRole("REQUESTER"))
app.post("/api/tickets", requireRole("REQUESTER"), async (req: Request, res: Response) => {

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
        itPriority: (requestedPriority as any) || "MEDIUM",
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

// GET /api/tickets (Paginated Ticket Listing - requireRole("REQUESTER"))
app.get("/api/tickets", requireRole("REQUESTER"), async (req: Request, res: Response) => {
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

// GET /api/tickets/:id (Get Owned Ticket Detail - requireRole("REQUESTER"))
app.get("/api/tickets/:id", requireRole("REQUESTER"), async (req: Request, res: Response) => {
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
        requester: { select: { id: true, name: true, email: true } },
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

// POST /api/tickets/:id/attachments (Upload Attachment - requireRole("REQUESTER"))
app.post("/api/tickets/:id/attachments", requireRole("REQUESTER"), (req: Request, res: Response) => {
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

// GET /api/tickets/:id/attachments (List Ticket Attachments Metadata - requireAuth)
app.get("/api/tickets/:id/attachments", requireAuth, async (req: Request, res: Response) => {
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

// GET /api/attachments/:id/download (Download Active Attachment Stream - requireAuth)
app.get("/api/attachments/:id/download", requireAuth, async (req: Request, res: Response) => {
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

    if (req.session?.role === "REQUESTER" && attachment.ticket.requesterId !== requesterId) {
      return res.status(404).json({
        error: "Not Found",
        message: "Attachment not found.",
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

// POST /api/attachments/:id/soft-remove (Soft-Remove Attachment - requireRole("REQUESTER"))
app.post("/api/attachments/:id/soft-remove", requireRole("REQUESTER"), async (req: Request, res: Response) => {
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

// GET /api/tickets/:id/comments (Public Comments Feed - requireAuth)
app.get("/api/tickets/:id/comments", requireAuth, async (req: Request, res: Response) => {
  try {
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

    // Requester must own ticket; return 404 to prevent resource existence probing (BR-16)
    if (req.session?.role === "REQUESTER" && ticket.requesterId !== req.session.userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "Ticket not found.",
      });
    }

    const comments = await getPrisma().comment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json(comments);
  } catch (error) {
    console.error("Error fetching ticket comments:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while fetching ticket comments.",
    });
  }
});

// POST /api/tickets/:id/comments (Post Public Comment - requireAuth)
app.post("/api/tickets/:id/comments", requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid ticket ID format.",
      });
    }

    let { content } = req.body || {};
    content = typeof content === "string" ? content.trim() : "";

    if (!content || content.length < 3 || content.length > 1000) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Public comment content is required and must be between 3 and 1000 characters.",
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

    // Requester must own ticket; return 404 to prevent existence probing (BR-16)
    if (req.session?.role === "REQUESTER" && ticket.requesterId !== req.session.userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "Ticket not found.",
      });
    }

    // Backend-generated authorship and timestamp (BR-21)
    const newComment = await getPrisma().comment.create({
      data: {
        ticketId,
        content,
        authorId: req.session!.userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json(newComment);
  } catch (error) {
    console.error("Error posting public comment:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while posting public comment.",
    });
  }
});

// POST /api/tickets/:id/indicate-resolved (Indicate Problem Appears Resolved - requireRole("REQUESTER"))
app.post("/api/tickets/:id/indicate-resolved", requireRole("REQUESTER"), async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid ticket ID format.",
      });
    }

    let { comment } = req.body || {};
    comment = typeof comment === "string" ? comment.trim() : "";

    if (!comment || comment.length < 3 || comment.length > 1000) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Resolution comment is required and must be between 3 and 1000 characters.",
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.requesterId !== req.session!.userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "Ticket not found.",
      });
    }

    // Appends public resolution comment without directly changing status (BR-05)
    const newComment = await getPrisma().comment.create({
      data: {
        ticketId,
        content: comment,
        authorId: req.session!.userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Exact HTTP 200 OK status code per api-spec.md Section 5.3
    return res.status(200).json({
      message: "Resolution indication recorded successfully",
      comment: newComment,
    });
  } catch (error) {
    console.error("Error submitting resolution indication:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while submitting resolution indication.",
    });
  }
});

// ==========================================
// IT STAFF TICKET QUEUE & OPERATIONS API
// ==========================================

// GET /api/staff/tickets (List Staff Ticket Queue - requireRole("IT_STAFF", "ADMINISTRATOR"))
app.get("/api/staff/tickets", requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
    const {
      search,
      categoryId,
      itPriority,
      currentStatus,
      assignedStaffId,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    // Resilient parameter parsing (STAFF-API-07, api-spec.md Section 6.1)
    let parsedPage = parseInt(String(page), 10);
    if (isNaN(parsedPage) || parsedPage < 1) parsedPage = 1;

    let parsedLimit = parseInt(String(limit), 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 10;

    const validSortFields = [
      "createdAt",
      "updatedAt",
      "itPriority",
      "requestedPriority",
      "currentStatus",
      "ticketNumber",
      "summary",
    ];
    const validSortBy = typeof sortBy === "string" && validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const validSortOrder = sortOrder === "asc" ? "asc" : "desc";

    const where: Prisma.TicketWhereInput = {};

    // Text search (ticket number, summary, description)
    if (typeof search === "string" && search.trim() !== "") {
      const searchTerm = search.trim();
      where.OR = [
        { ticketNumber: { contains: searchTerm, mode: "insensitive" } },
        { summary: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (categoryId) {
      const parsedCatId = parseInt(String(categoryId), 10);
      if (!isNaN(parsedCatId)) {
        where.categoryId = parsedCatId;
      }
    }

    // IT Priority filter
    if (typeof itPriority === "string" && Object.values(RequestedPriority).includes(itPriority as RequestedPriority)) {
      where.itPriority = itPriority as RequestedPriority;
    }

    // Status filter
    if (typeof currentStatus === "string" && Object.values(TicketStatus).includes(currentStatus as TicketStatus)) {
      where.currentStatus = currentStatus as TicketStatus;
    }

    // Assigned Owner filter
    if (assignedStaffId) {
      if (assignedStaffId === "null" || assignedStaffId === "unassigned") {
        where.assignedStaffId = null;
      } else {
        const parsedStaffId = parseInt(String(assignedStaffId), 10);
        if (!isNaN(parsedStaffId)) {
          where.assignedStaffId = parsedStaffId;
        }
      }
    }

    const totalItems = await getPrisma().ticket.count({ where });
    const totalPages = Math.ceil(totalItems / parsedLimit) || 1;

    const tickets = await getPrisma().ticket.findMany({
      where,
      orderBy: { [validSortBy]: validSortOrder },
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedStaff: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        category: true,
        relatedSystem: true,
      },
    });

    return res.status(200).json({
      data: tickets,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching staff ticket queue:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while fetching ticket queue.",
    });
  }
});

// GET /api/staff/tickets/:id (Get Staff Ticket Detail - requireRole("IT_STAFF", "ADMINISTRATOR"))
app.get("/api/staff/tickets/:id", requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
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
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedStaff: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        category: true,
        relatedSystem: true,
        attachments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Not Found",
        message: "Ticket not found.",
      });
    }

    return res.status(200).json(ticket);
  } catch (error) {
    console.error("Error fetching staff ticket detail:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while fetching ticket detail.",
    });
  }
});

// PATCH /api/staff/tickets/:id/assign (Claim/Assign/Reassign Ownership - requireRole("IT_STAFF"))
app.patch("/api/staff/tickets/:id/assign", requireRole("IT_STAFF"), async (req: Request, res: Response) => {
  try {
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

    const { assignedStaffId } = req.body || {};

    if (assignedStaffId !== null && assignedStaffId !== undefined) {
      const targetId = parseInt(String(assignedStaffId), 10);
      if (isNaN(targetId) || targetId <= 0) {
        return res.status(400).json({
          error: "Bad Request",
          code: "INVALID_ASSIGNMENT_TARGET",
          message: "Cannot assign ticket to selected account.",
        });
      }

      const targetUser = await getPrisma().user.findUnique({
        where: { id: targetId },
      });

      if (!targetUser || !targetUser.isActive || (targetUser.role !== "IT_STAFF" && targetUser.role !== "ADMINISTRATOR")) {
        return res.status(400).json({
          error: "Bad Request",
          code: "INVALID_ASSIGNMENT_TARGET",
          message: "Cannot assign ticket to selected account. Target must be an active IT Staff or Administrator.",
        });
      }
    }

    const newAssignedId = assignedStaffId === null ? null : parseInt(String(assignedStaffId), 10);

    const updatedTicket = await getPrisma().ticket.update({
      where: { id: ticketId },
      data: { assignedStaffId: newAssignedId },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assignedStaff: { select: { id: true, name: true, email: true, role: true } },
        category: true,
        relatedSystem: true,
      },
    });

    return res.status(200).json(updatedTicket);
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while updating ticket assignment.",
    });
  }
});

// PATCH /api/staff/tickets/:id/priority (Update IT Priority - requireRole("IT_STAFF"))
app.patch("/api/staff/tickets/:id/priority", requireRole("IT_STAFF"), async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid ticket ID format.",
      });
    }

    const { itPriority } = req.body || {};

    if (!itPriority || !Object.values(RequestedPriority).includes(itPriority as RequestedPriority)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Valid IT Priority (LOW, MEDIUM, HIGH, URGENT) is required.",
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

    const updatedTicket = await getPrisma().ticket.update({
      where: { id: ticketId },
      data: { itPriority: itPriority as RequestedPriority },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assignedStaff: { select: { id: true, name: true, email: true, role: true } },
        category: true,
        relatedSystem: true,
      },
    });

    return res.status(200).json(updatedTicket);
  } catch (error) {
    console.error("Error updating IT priority:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while updating IT priority.",
    });
  }
});

// PATCH /api/staff/tickets/:id/status (Update Ticket Status per Matrix - requireRole("IT_STAFF"))
app.patch("/api/staff/tickets/:id/status", requireRole("IT_STAFF"), async (req: Request, res: Response) => {
  try {
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

    const { status, resolutionSummary } = req.body || {};

    if (!status || !Object.values(TicketStatus).includes(status as TicketStatus)) {
      return res.status(400).json({
        error: "Bad Request",
        code: "INVALID_STATUS_TRANSITION",
        message: "Valid target ticket status is required.",
      });
    }

    // Validate state machine transition (BR-14)
    if (!isValidStatusTransition(ticket.currentStatus, status as TicketStatus)) {
      return res.status(400).json({
        error: "Bad Request",
        code: "INVALID_STATUS_TRANSITION",
        message: `Invalid status transition from ${ticket.currentStatus} to ${status}.`,
      });
    }

    let finalResolutionSummary = ticket.resolutionSummary;
    if (status === TicketStatus.RESOLVED && resolutionSummary !== undefined) {
      const trimmed = typeof resolutionSummary === "string" ? resolutionSummary.trim() : "";
      if (trimmed.length > 1000) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Resolution summary cannot exceed 1000 characters.",
        });
      }
      finalResolutionSummary = trimmed !== "" ? trimmed : null;
    }

    const updatedTicket = await getPrisma().ticket.update({
      where: { id: ticketId },
      data: {
        currentStatus: status as TicketStatus,
        resolutionSummary: finalResolutionSummary,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        assignedStaff: { select: { id: true, name: true, email: true, role: true } },
        category: true,
        relatedSystem: true,
      },
    });

    return res.status(200).json(updatedTicket);
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while updating ticket status.",
    });
  }
});

// GET /api/staff/tickets/:id/notes (Get Internal Notes - requireRole("IT_STAFF", "ADMINISTRATOR"))
app.get("/api/staff/tickets/:id/notes", requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
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

    const notes = await getPrisma().internalNote.findMany({
      where: { ticketId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json(notes);
  } catch (error) {
    console.error("Error fetching internal notes:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while fetching internal notes.",
    });
  }
});

// POST /api/staff/tickets/:id/notes (Post Internal Note - requireRole("IT_STAFF", "ADMINISTRATOR"))
app.post("/api/staff/tickets/:id/notes", requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
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

    let { content } = req.body || {};
    content = typeof content === "string" ? content.trim() : "";

    if (!content || content.length < 3 || content.length > 2000) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Internal note content is required and must be between 3 and 2000 characters.",
      });
    }

    // Backend-generated authorship and timestamp (BR-21)
    const newNote = await getPrisma().internalNote.create({
      data: {
        ticketId,
        content,
        authorId: req.session!.userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json(newNote);
  } catch (error) {
    console.error("Error posting internal note:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while posting internal note.",
    });
  }
});

export default app;
