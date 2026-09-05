import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 Attachments API - Upload, Metadata, Download, Soft-Remove & Ownership Security (API-06, API-07, API-08, API-09, API-10, API-12)", () => {
  let requester1Id: number;
  let requester2Id: number;
  let ticket1Id: number;
  let samplePdfPath: string;
  let sampleTxtPath: string;

  beforeEach(async () => {
    const prisma = getPrisma();

    // Get seeded active requesters
    const requesters = await prisma.developmentRequester.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    requester1Id = requesters[0].id;
    requester2Id = requesters[1].id;

    const cat = await prisma.category.findFirst({ where: { isActive: true } });
    const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Clean existing attachments & tickets
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});

    // Create ticket owned by Requester 1
    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-000888",
        summary: "Software installation error",
        description: "Cannot install IDE software package.",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
        itPriority: "UNASSIGNED",
        requesterId: requester1Id,
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
      },
    });
    ticket1Id = t1.id;

    // Create dummy sample test files
    const testDir = path.resolve(process.cwd(), "scratch_test");
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    samplePdfPath = path.join(testDir, "sample.pdf");
    sampleTxtPath = path.join(testDir, "sample.exe");

    fs.writeFileSync(samplePdfPath, "%PDF-1.4 dummy pdf content");
    fs.writeFileSync(sampleTxtPath, "dummy executable content");
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("POST /api/tickets/:id/attachments uploads valid PDF file (API-06, AC-04, BR-15, BR-18)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticket1Id}/attachments`)
      .set("X-Development-Requester-Id", String(requester1Id))
      .attach("file", samplePdfPath);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.filename).toBe("sample.pdf");
    expect(res.body.mimeType).toBe("application/pdf");
    expect(res.body.isRemoved).toBe(false);
  });

  it("POST /api/tickets/:id/attachments rejects invalid MIME type .exe (API-07, AC-05, BR-15)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticket1Id}/attachments`)
      .set("X-Development-Requester-Id", String(requester1Id))
      .attach("file", sampleTxtPath);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Bad Request");
  });

  it("POST /api/tickets/:id/attachments enforces maximum 5 active attachments limit (API-08, AC-06, BR-17)", async () => {
    const prisma = getPrisma();

    // Create 5 active dummy attachments
    for (let i = 1; i <= 5; i++) {
      await prisma.attachment.create({
        data: {
          ticketId: ticket1Id,
          filename: `file_${i}.pdf`,
          storedFilename: `uuid_${i}.pdf`,
          mimeType: "application/pdf",
          fileSize: 1024,
          filePath: samplePdfPath,
        },
      });
    }

    // Try uploading a 6th attachment
    const res = await request(app)
      .post(`/api/tickets/${ticket1Id}/attachments`)
      .set("X-Development-Requester-Id", String(requester1Id))
      .attach("file", samplePdfPath);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/limit/i);
  });

  it("POST /api/attachments/:id/soft-remove soft-removes attachment with valid reason (API-09, AC-07, BR-19, BR-20)", async () => {
    const prisma = getPrisma();
    const att = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        filename: "screenshot.png",
        storedFilename: "uuid_screen.png",
        mimeType: "image/png",
        fileSize: 2048,
        filePath: samplePdfPath,
      },
    });

    const res = await request(app)
      .post(`/api/attachments/${att.id}/soft-remove`)
      .set("X-Development-Requester-Id", String(requester1Id))
      .send({ removalReason: "Uploaded wrong screenshot file" });

    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.removalReason).toBe("Uploaded wrong screenshot file");
    expect(res.body.removedAt).toBeDefined();
  });

  it("GET /api/attachments/:id/download returns HTTP 410 Gone for soft-removed file (API-10, AC-08, BR-21)", async () => {
    const prisma = getPrisma();
    const att = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        filename: "old_doc.pdf",
        storedFilename: "uuid_old_doc.pdf",
        mimeType: "application/pdf",
        fileSize: 4096,
        filePath: samplePdfPath,
        isRemoved: true,
        removedAt: new Date(),
        removalReason: "Superceded version",
      },
    });

    const res = await request(app)
      .get(`/api/attachments/${att.id}/download`)
      .set("X-Development-Requester-Id", String(requester1Id));

    expect(res.status).toBe(410);
    expect(res.body.error).toBe("Gone");
  });

  it("Enforces cross-requester security (HTTP 403 Forbidden) on upload, download, and soft-remove (API-12, AC-21, BR-06)", async () => {
    const prisma = getPrisma();
    const att = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        filename: "confidential.pdf",
        storedFilename: "uuid_confidential.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        filePath: samplePdfPath,
      },
    });

    // Upload attempt by Requester 2 -> 403
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticket1Id}/attachments`)
      .set("X-Development-Requester-Id", String(requester2Id))
      .attach("file", samplePdfPath);
    expect(uploadRes.status).toBe(403);

    // Download attempt by Requester 2 -> 403
    const downloadRes = await request(app)
      .get(`/api/attachments/${att.id}/download`)
      .set("X-Development-Requester-Id", String(requester2Id));
    expect(downloadRes.status).toBe(403);

    // Soft-remove attempt by Requester 2 -> 403
    const removeRes = await request(app)
      .post(`/api/attachments/${att.id}/soft-remove`)
      .set("X-Development-Requester-Id", String(requester2Id))
      .send({ removalReason: "Unauthorized removal attempt" });
    expect(removeRes.status).toBe(403);
  });
});
