import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";
import { TicketStatus, RequestedPriority } from "@prisma/client";

const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" };

describe("Lab 3 Staff Ticket Detail & Operations API Tests (STAFF-API-02 to STAFF-API-08)", () => {
  let staffAgent: any;
  let staffId: number;
  let adminAgent: any;
  let adminId: number;
  let requesterAgent: any;
  let requesterId: number;
  let inactiveStaffId: number;
  let ticketId: number;
  let cancelledTicketId: number;

  beforeEach(async () => {
    const prisma = getPrisma();
    const initialPasswordHash = await bcrypt.hash("Initial123!", 10);

    // Reset password hashes & active status for test accounts
    await prisma.user.updateMany({
      where: {
        email: {
          in: ["alex.t@toktickit.local", "admin@toktickit.local", "jennifer.a@toktickit.local", "inactive.staff@toktickit.local"],
        },
      },
      data: {
        passwordHash: initialPasswordHash,
        mustChangePassword: true,
      },
    });

    const staffUser = await prisma.user.findUnique({ where: { email: "alex.t@toktickit.local" } });
    const adminUser = await prisma.user.findUnique({ where: { email: "admin@toktickit.local" } });
    const reqUser = await prisma.user.findUnique({ where: { email: "jennifer.a@toktickit.local" } });
    const inactiveUser = await prisma.user.findUnique({ where: { email: "inactive.staff@toktickit.local" } });

    staffId = staffUser!.id;
    adminId = adminUser!.id;
    requesterId = reqUser!.id;
    inactiveStaffId = inactiveUser!.id;

    // Login Staff (Alex Thompson)
    staffAgent = request.agent(app);
    await staffAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "alex.t@toktickit.local", password: "Initial123!" });
    await staffAgent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });

    // Login Admin (admin@toktickit.local)
    adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "admin@toktickit.local", password: "Initial123!" });
    await adminAgent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });

    // Login Requester (Jennifer Anderson)
    requesterAgent = request.agent(app);
    await requesterAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER)
      .send({ email: "jennifer.a@toktickit.local", password: "Initial123!" });
    await requesterAgent
      .post("/api/auth/change-password")
      .set(CSRF_HEADER)
      .send({
        currentPassword: "Initial123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });

    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    // Create a fresh test ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now()}`,
        summary: "Staff test ticket",
        description: "Test ticket for IT Staff operational endpoints",
        requestedPriority: RequestedPriority.MEDIUM,
        itPriority: RequestedPriority.MEDIUM,
        currentStatus: TicketStatus.NEW,
        requesterId,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
    ticketId = ticket.id;

    // Create a separate dedicated cancelled ticket for testing illegal transitions from CANCELLED
    const cancelledTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-CANCEL-${Date.now()}`,
        summary: "Cancelled test ticket",
        description: "Dedicated cancelled ticket for transition validation",
        requestedPriority: RequestedPriority.LOW,
        itPriority: RequestedPriority.LOW,
        currentStatus: TicketStatus.CANCELLED,
        requesterId,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
    cancelledTicketId = cancelledTicket.id;
  });

  it("STAFF-API-02: should allow IT Staff to claim ticket ownership", async () => {
    const res = await staffAgent
      .patch(`/api/staff/tickets/${ticketId}/assign`)
      .set(CSRF_HEADER)
      .send({ assignedStaffId: staffId });

    expect(res.status).toBe(200);
    expect(res.body.assignedStaffId).toBe(staffId);
  });

  it("STAFF-API-02: should allow IT Staff to reassign ticket to an active Administrator", async () => {
    const res = await staffAgent
      .patch(`/api/staff/tickets/${ticketId}/assign`)
      .set(CSRF_HEADER)
      .send({ assignedStaffId: adminId });

    expect(res.status).toBe(200);
    expect(res.body.assignedStaffId).toBe(adminId);
  });

  it("STAFF-API-02: should allow IT Staff to unassign a ticket by passing assignedStaffId: null", async () => {
    const res = await staffAgent
      .patch(`/api/staff/tickets/${ticketId}/assign`)
      .set(CSRF_HEADER)
      .send({ assignedStaffId: null });

    expect(res.status).toBe(200);
    expect(res.body.assignedStaffId).toBeNull();
  });

  it("STAFF-API-08: should reject assignment to a Requester user with HTTP 400 Bad Request", async () => {
    const res = await staffAgent
      .patch(`/api/staff/tickets/${ticketId}/assign`)
      .set(CSRF_HEADER)
      .send({ assignedStaffId: requesterId });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_ASSIGNMENT_TARGET");
  });

  it("STAFF-API-08: should reject assignment to an inactive staff user with HTTP 400 Bad Request", async () => {
    const res = await staffAgent
      .patch(`/api/staff/tickets/${ticketId}/assign`)
      .set(CSRF_HEADER)
      .send({ assignedStaffId: inactiveStaffId });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_ASSIGNMENT_TARGET");
  });

  it("STAFF-API-03: should allow IT Staff to update IT priority while preserving requested priority", async () => {
    const res = await staffAgent
      .patch(`/api/staff/tickets/${ticketId}/priority`)
      .set(CSRF_HEADER)
      .send({ itPriority: "URGENT" });

    expect(res.status).toBe(200);
    expect(res.body.itPriority).toBe("URGENT");
    expect(res.body.requestedPriority).toBe("MEDIUM");
  });

  it("STAFF-API-06: should automatically initialize itPriority = requestedPriority when ticket is created by Requester", async () => {
    const category = await getPrisma().category.findFirst();
    const system = await getPrisma().relatedSystem.findFirst();

    const createRes = await requesterAgent
      .post("/api/tickets")
      .set(CSRF_HEADER)
      .send({
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "HIGH",
        summary: "New test ticket for priority init",
        description: "Checking automatic initialization of itPriority on ticket creation",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.requestedPriority).toBe("HIGH");
    expect(createRes.body.itPriority).toBe("HIGH");
  });

  it("STAFF-API-04: should update status on valid transition (NEW -> OPEN -> IN_PROGRESS -> RESOLVED) and record resolutionSummary", async () => {
    // NEW -> OPEN
    const res1 = await staffAgent
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "OPEN" });
    expect(res1.status).toBe(200);
    expect(res1.body.currentStatus).toBe("OPEN");

    // OPEN -> IN_PROGRESS
    const res2 = await staffAgent
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "IN_PROGRESS" });
    expect(res2.status).toBe(200);
    expect(res2.body.currentStatus).toBe("IN_PROGRESS");

    // IN_PROGRESS -> RESOLVED with resolutionSummary
    const res3 = await staffAgent
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set(CSRF_HEADER)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Replaced faulty hardware component.",
      });
    expect(res3.status).toBe(200);
    expect(res3.body.currentStatus).toBe("RESOLVED");
    expect(res3.body.resolutionSummary).toBe("Replaced faulty hardware component.");
  });

  it("STAFF-API-04: should reject invalid status transition with HTTP 400 Bad Request", async () => {
    // NEW -> RESOLVED is invalid
    const res = await staffAgent
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "RESOLVED" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("STAFF-API-04: should reject any transition out of CANCELLED status on dedicated cancelled ticket", async () => {
    const res = await staffAgent
      .patch(`/api/staff/tickets/${cancelledTicketId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "OPEN" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("SEC-API-04: should deny Administrator PATCH operations (assign, priority, status) with HTTP 403 Forbidden", async () => {
    const assignRes = await adminAgent
      .patch(`/api/staff/tickets/${ticketId}/assign`)
      .set(CSRF_HEADER)
      .send({ assignedStaffId: adminId });
    expect(assignRes.status).toBe(403);

    const priorityRes = await adminAgent
      .patch(`/api/staff/tickets/${ticketId}/priority`)
      .set(CSRF_HEADER)
      .send({ itPriority: "HIGH" });
    expect(priorityRes.status).toBe(403);

    const statusRes = await adminAgent
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set(CSRF_HEADER)
      .send({ status: "OPEN" });
    expect(statusRes.status).toBe(403);
  });
});
