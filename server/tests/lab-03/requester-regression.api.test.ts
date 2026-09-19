import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" };

describe("Lab 3 Requester Regression Tests (REG-API-01, REG-API-02)", () => {
  let requesterAgent: any;
  let requesterId: number;

  beforeEach(async () => {
    const prisma = getPrisma();
    const initialPasswordHash = await bcrypt.hash("Initial123!", 10);

    // Reset password hashes & active status for test accounts
    await prisma.user.updateMany({
      where: {
        email: {
          in: ["jennifer.a@toktickit.local"],
        },
      },
      data: {
        passwordHash: initialPasswordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });

    // Clean up test tickets & attachments
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});

    // Authenticate Requester (Jennifer Anderson) and complete mandatory password change
    requesterAgent = request.agent(app);
    const loginRes = await requesterAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "jennifer.a@toktickit.local", password: "Initial123!" });
    expect(loginRes.status).toBe(200);
    requesterId = loginRes.body.user.id;

    const changePw = await requesterAgent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });
    expect(changePw.status).toBe(200);
  });

  // REG-API-01: Authenticated Requester Ticket & Attachment endpoints regression
  it("REG-API-01: Authenticated Requester can create ticket, list owned tickets, fetch detail, and upload attachments", async () => {
    // 1. Create ticket
    const createRes = await requesterAgent
      .post("/api/tickets")
      .set(CSRF_HEADER)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "HIGH",
        summary: "VPN authentication error",
        description: "Cannot connect to campus VPN network.",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.ticketNumber).toBeDefined();
    expect(createRes.body.itPriority).toBe("HIGH"); // BR-17 initialization
    const ticketId = createRes.body.id;

    // 2. List owned tickets
    const listRes = await requesterAgent.get("/api/tickets?search=VPN");
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBe(1);
    expect(listRes.body.items[0].id).toBe(ticketId);

    // 3. Fetch owned ticket detail
    const detailRes = await requesterAgent.get(`/api/tickets/${ticketId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.summary).toBe("VPN authentication error");

    // 4. Upload attachment
    const fileBuffer = Buffer.from("%PDF-1.4 test pdf content");
    const uploadRes = await requesterAgent
      .post(`/api/tickets/${ticketId}/attachments`)
      .set(CSRF_HEADER)
      .attach("file", fileBuffer, "vpn_error_log.pdf");

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.filename).toBe("vpn_error_log.pdf");
  });

  // REG-API-02: Soft-removed attachment history & download protection (HTTP 410 Gone)
  it("REG-API-02: Soft-removed attachment is listed as removed and direct download returns HTTP 410 Gone", async () => {
    // Create ticket
    const createRes = await requesterAgent
      .post("/api/tickets")
      .set(CSRF_HEADER)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "LOW",
        summary: "Printer driver installation request",
        description: "Need driver installed for floor 2 printer.",
      });
    const ticketId = createRes.body.id;

    // Upload attachment
    const fileBuffer = Buffer.from("test image binary data");
    const uploadRes = await requesterAgent
      .post(`/api/tickets/${ticketId}/attachments`)
      .set(CSRF_HEADER)
      .attach("file", fileBuffer, "screenshot.png");
    const attachmentId = uploadRes.body.id;

    // Soft-remove attachment
    const removeRes = await requesterAgent
      .post(`/api/attachments/${attachmentId}/soft-remove`)
      .set(CSRF_HEADER)
      .send({ removalReason: "Uploaded wrong screenshot file" });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);

    // List attachments history
    const listRes = await requesterAgent.get(`/api/tickets/${ticketId}/attachments`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBe(1);
    expect(listRes.body[0].isRemoved).toBe(true);
    expect(listRes.body[0].removalReason).toBe("Uploaded wrong screenshot file");

    // Attempt direct download -> HTTP 410 Gone (BR-20)
    const downloadRes = await requesterAgent.get(`/api/attachments/${attachmentId}/download`);
    expect(downloadRes.status).toBe(410);
  });
});
