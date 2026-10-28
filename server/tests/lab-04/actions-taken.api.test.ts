import { startTestServer } from "../testHttpServer.js";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const csrf = { "X-Requested-With": "XMLHttpRequest" };
const password = "NewPassword123!";

describe("Lab 4 Actions Taken API", () => {
  let staff: any;
  let admin: any;
  let requester: any;
  let ticketId: number;
  let staffId: number;
  let adminId: number;
  let requesterId: number;
  let inactiveStaffId: number;

  async function login(email: string) {
    const agent = request.agent(await startTestServer(app));
    await agent.post("/api/auth/login").set(csrf).send({ email, password: "Initial123!" }).expect(200);
    await agent.post("/api/auth/change-password").set(csrf).send({ currentPassword: "Initial123!", newPassword: password, confirmPassword: password }).expect(200);
    return agent;
  }

  async function createOpenTicket(suffix: string) {
    const prisma = getPrisma();
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    return prisma.ticket.create({ data: {
      ticketNumber: `TKT-ACTION-${Date.now()}-${suffix}`,
      summary: `Actions API ${suffix}`,
      description: "Disposable ticket used for isolated Actions API coverage.",
      requesterId,
      categoryId: category.id,
      relatedSystemId: system.id,
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "OPEN",
    } });
  }

  beforeAll(async () => {
    const prisma = getPrisma();
    const hash = await bcrypt.hash("Initial123!", 10);
    await prisma.user.updateMany({ where: { email: { in: ["alex.t@toktickit.local", "admin@toktickit.local", "jennifer.a@toktickit.local"] } }, data: { passwordHash: hash, mustChangePassword: true } });
    const [staffUser, adminUser, requesterUser, inactive] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: "alex.t@toktickit.local" } }),
      prisma.user.findUniqueOrThrow({ where: { email: "admin@toktickit.local" } }),
      prisma.user.findUniqueOrThrow({ where: { email: "jennifer.a@toktickit.local" } }),
      prisma.user.findUniqueOrThrow({ where: { email: "inactive.staff@toktickit.local" } }),
    ]);
    staffId = staffUser.id; adminId = adminUser.id; requesterId = requesterUser.id; inactiveStaffId = inactive.id;
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    const ticket = await prisma.ticket.create({ data: {
      ticketNumber: `TKT-ACTION-${Date.now()}`, summary: "Actions API test", description: "Ticket used for Actions API coverage.",
      requesterId, categoryId: category.id, relatedSystemId: system.id, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "OPEN",
    } });
    ticketId = ticket.id;
    staff = await login("alex.t@toktickit.local");
    admin = await login("admin@toktickit.local");
    requester = await login("jennifer.a@toktickit.local");
  });

  it("allows owned Requester reads but forbids Requester writes", async () => {
    await requester.get(`/api/tickets/${ticketId}/actions-taken`).expect(200);
    await requester.post(`/api/tickets/${ticketId}/actions-taken`).set(csrf).send({ workflowRevision: 0, requestKey: "requester", description: "forbidden" }).expect(403);
    await requester.patch(`/api/tickets/${ticketId}/actions-taken/1`).set(csrf).send({ workflowRevision: 0, result: "forbidden" }).expect(403);
    await request(await startTestServer(app)).get(`/api/tickets/${ticketId}/actions-taken`).expect(401).then((response) => expect(response.body).toMatchObject({ error: "Authentication required. Please log in.", code: "UNAUTHENTICATED" }));
    const otherTicket = await getPrisma().ticket.findFirstOrThrow({ where: { requesterId: { not: requesterId } } });
    await requester.get(`/api/tickets/${otherTicket.id}/actions-taken`).expect(404);
  });

  it("creates an Action from session identity and rejects an inactive assignee", async () => {
    await staff.post(`/api/tickets/${ticketId}/actions-taken`).set(csrf).send({ workflowRevision: 0, requestKey: "create-1", description: "  Inspect workstation  ", assignedToId: inactiveStaffId }).expect(400);
    const response = await staff.post(`/api/tickets/${ticketId}/actions-taken`).set(csrf).send({ workflowRevision: 0, requestKey: "create-1", description: "  Inspect workstation  ", assignedToId: adminId }).expect(201);
    expect(response.body.action.performedById).toBe(staffId);
    expect(response.body.action.description).toBe("Inspect workstation");
    expect(response.body.workflowRevision).toBe(1);
  });

  it("returns identical creation retries and rejects changed payload reuse", async () => {
    const replay = await staff.post(`/api/tickets/${ticketId}/actions-taken`).set(csrf).send({ workflowRevision: 1, requestKey: "create-1", description: "Inspect workstation", assignedToId: adminId }).expect(201);
    expect(replay.body.action.id).toBeDefined();
    await staff.post(`/api/tickets/${ticketId}/actions-taken`).set(csrf).send({ workflowRevision: 1, requestKey: "create-1", description: "Different payload", assignedToId: adminId }).expect(409);
    expect(await getPrisma().actionTaken.count({ where: { ticketId } })).toBe(1);
  });

  it("enforces stale revisions and the approved lifecycle", async () => {
    const response = await staff.patch(`/api/tickets/${ticketId}/actions-taken/${(await getPrisma().actionTaken.findFirstOrThrow({ where: { ticketId } })).id}`).set(csrf).send({ workflowRevision: 0, status: "COMPLETED", result: "Completed diagnostic" }).expect(409);
    expect(response.body.code).toBe("STALE_REVISION");
    const action = await getPrisma().actionTaken.findFirstOrThrow({ where: { ticketId } });
    const completed = await staff.patch(`/api/tickets/${ticketId}/actions-taken/${action.id}`).set(csrf).send({ workflowRevision: 1, status: "COMPLETED", result: "Completed diagnostic" }).expect(200);
    expect(completed.body.action.status).toBe("COMPLETED");
    await staff.patch(`/api/tickets/${ticketId}/actions-taken/${action.id}`).set(csrf).send({ workflowRevision: 2, status: "PLANNED" }).expect(400);
    const created = await staff.post(`/api/tickets/${ticketId}/actions-taken`).set(csrf).send({ workflowRevision: 2, requestKey: "cancel-1", description: "Duplicate diagnostic", performedById: adminId }).expect(201);
    const cancelled = await staff.patch(`/api/tickets/${ticketId}/actions-taken/${created.body.action.id}`).set(csrf).send({ workflowRevision: 3, status: "CANCELLED", result: "Cancelled duplicate diagnostic" }).expect(200);
    expect(cancelled.body.action.status).toBe("CANCELLED");
    const events = await getPrisma().actionAuditEvent.findMany({ where: { actionId: created.body.action.id }, orderBy: { id: "asc" } });
    expect(events.map((event) => event.eventType)).toEqual(["CREATED", "CANCELLED"]);
    expect(events[1].actorId).toBe(staffId);
  });

  it("rejects Action writes on terminal Tickets", async () => {
    await getPrisma().ticket.update({ where: { id: ticketId }, data: { currentStatus: "CLOSED" } });
    await staff.post(`/api/tickets/${ticketId}/actions-taken`).set(csrf).send({ workflowRevision: 4, requestKey: "terminal-create", description: "forbidden" }).expect(409).then((response: any) => expect(response.body).toMatchObject({ code: "TICKET_NOT_WRITABLE" }));
    const action = await getPrisma().actionTaken.findFirstOrThrow({ where: { ticketId } });
    await staff.patch(`/api/tickets/${ticketId}/actions-taken/${action.id}`).set(csrf).send({ workflowRevision: 4, result: "forbidden" }).expect(409);
    expect(await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticketId } })).toMatchObject({ workflowRevision: 4, currentStatus: "CLOSED" });
  });

  it("rejects forged parent/action relationships", async () => {
    const action = await getPrisma().actionTaken.findFirstOrThrow({ where: { ticketId } });
    await admin.get(`/api/tickets/${ticketId + 999999}/actions-taken`).expect(404);
    await admin.patch(`/api/tickets/${ticketId + 999999}/actions-taken/${action.id}`).set(csrf).send({ workflowRevision: 2, result: "wrong parent" }).expect(404);
  });

  it("covers Admin mutations, assignment clearing, validation, and stable ordering", async () => {
    const ticket = await createOpenTicket("coverage");
    const invalid = await admin.post(`/api/tickets/${ticket.id}/actions-taken`).set(csrf).send({ workflowRevision: 0, requestKey: "invalid", description: "   " }).expect(400);
    expect(invalid.body.code).toBe("VALIDATION_ERROR");
    await admin.post(`/api/tickets/${ticket.id}/actions-taken`).set(csrf).send({ workflowRevision: 0, requestKey: "admin-create-1", description: "First admin action", assignedToId: staffId }).expect(201);
    const second = await admin.post(`/api/tickets/${ticket.id}/actions-taken`).set(csrf).send({ workflowRevision: 1, requestKey: "admin-create-2", description: "Second admin action", assignedToId: null }).expect(201);
    expect(second.body.action.performedById).toBe(adminId);
    expect(second.body.action.assignedToId).toBeNull();
    const listed = await admin.get(`/api/tickets/${ticket.id}/actions-taken`).expect(200);
    expect(listed.body.actions.map((action: any) => action.description)).toEqual(["First admin action", "Second admin action"]);
    const first = listed.body.actions[0];
    await admin.patch(`/api/tickets/${ticket.id}/actions-taken/${first.id}`).set(csrf).send({ workflowRevision: 2, assignedToId: null }).expect(200);
  });

  it("enforces completed correction allowlists and cancelled immutability", async () => {
    const ticket = await createOpenTicket("terminal-corrections");
    const created = await staff.post(`/api/tickets/${ticket.id}/actions-taken`).set(csrf).send({ workflowRevision: 0, requestKey: "correction", description: "Correction action" }).expect(201);
    const completed = await staff.patch(`/api/tickets/${ticket.id}/actions-taken/${created.body.action.id}`).set(csrf).send({ workflowRevision: 1, status: "COMPLETED", result: "Done" }).expect(200);
    const corrected = await admin.patch(`/api/tickets/${ticket.id}/actions-taken/${created.body.action.id}`).set(csrf).send({ workflowRevision: 2, result: "Corrected", attachmentNotes: "Evidence" }).expect(200);
    expect(corrected.body.action.status).toBe("COMPLETED");
    expect(corrected.body.action.performedById).toBe(completed.body.action.performedById);
    await admin.patch(`/api/tickets/${ticket.id}/actions-taken/${created.body.action.id}`).set(csrf).send({ workflowRevision: 3, description: "forbidden" }).expect(400);
    const cancelled = await staff.post(`/api/tickets/${ticket.id}/actions-taken`).set(csrf).send({ workflowRevision: 3, requestKey: "cancelled", description: "Cancelled action" }).expect(201);
    await staff.patch(`/api/tickets/${ticket.id}/actions-taken/${cancelled.body.action.id}`).set(csrf).send({ workflowRevision: 4, status: "CANCELLED", result: "No longer needed" }).expect(200);
    await staff.patch(`/api/tickets/${ticket.id}/actions-taken/${cancelled.body.action.id}`).set(csrf).send({ workflowRevision: 5, result: "Attempted edit" }).expect(400);
  });

  it("serializes concurrent Action mutations and preserves one revision/audit outcome", async () => {
    const ticket = await createOpenTicket("concurrency");
    const created = await staff.post(`/api/tickets/${ticket.id}/actions-taken`).set(csrf).send({ workflowRevision: 0, requestKey: "concurrent-create", description: "Concurrent action" }).expect(201);
    const actionId = created.body.action.id;
    const [first, second] = await Promise.all([
      staff.patch(`/api/tickets/${ticket.id}/actions-taken/${actionId}`).set(csrf).send({ workflowRevision: 1, result: "First concurrent update" }),
      admin.patch(`/api/tickets/${ticket.id}/actions-taken/${actionId}`).set(csrf).send({ workflowRevision: 1, result: "Second concurrent update" }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const ticketAfter = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const actionAfter = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: actionId } });
    const events = await getPrisma().actionAuditEvent.findMany({ where: { actionId }, orderBy: { id: "asc" } });
    expect(ticketAfter.workflowRevision).toBe(2);
    expect(actionAfter.result).toMatch(/concurrent update/);
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.eventType)).toEqual(["CREATED", "UPDATED"]);
  });

  it("does not partially apply a stale mutation or append an audit event", async () => {
    const ticket = await createOpenTicket("rollback");
    const created = await staff.post(`/api/tickets/${ticket.id}/actions-taken`).set(csrf).send({ workflowRevision: 0, requestKey: "rollback-create", description: "Rollback action" }).expect(201);
    const before = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: created.body.action.id } });
    const beforeEvents = await getPrisma().actionAuditEvent.count({ where: { actionId: before.id } });
    const response = await staff.patch(`/api/tickets/${ticket.id}/actions-taken/${before.id}`).set(csrf).send({ workflowRevision: 0, result: "Must not persist" }).expect(409);
    expect(response.body.code).toBe("STALE_REVISION");
    const afterTicket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const afterAction = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: before.id } });
    const afterEvents = await getPrisma().actionAuditEvent.count({ where: { actionId: before.id } });
    expect(afterTicket.workflowRevision).toBe(1);
    expect(afterAction.result).toBe(before.result);
    expect(afterEvents).toBe(beforeEvents);
  });
});
