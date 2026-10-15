import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, TestDatabase } from "./migrationTestDatabase.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

let db: TestDatabase;
beforeAll(async () => { db = await createTestDatabase(); db.deployThrough(); });
afterAll(async () => { if (db) await db.dispose(); });
const snapshot = async () => ({
  users: await db.client.user.findMany({ orderBy: { id: "asc" } }),
  categories: await db.client.category.findMany({ orderBy: { id: "asc" } }),
  systems: await db.client.relatedSystem.findMany({ orderBy: { id: "asc" } }),
  tickets: await db.client.ticket.findMany({ orderBy: { id: "asc" } }),
  attachments: await db.client.attachment.findMany({ orderBy: { id: "asc" } }),
  comments: await db.client.comment.findMany({ orderBy: { id: "asc" } }),
  notes: await db.client.internalNote.findMany({ orderBy: { id: "asc" } }),
  actions: await db.client.actionTaken.findMany({ orderBy: { id: "asc" } }),
  events: await db.client.actionAuditEvent.findMany({ orderBy: { id: "asc" } }),
  requests: await db.client.actionCreationRequest.findMany({ orderBy: { id: "asc" } }),
});

describe.sequential("Lab 4 preservation-oriented seed", () => {
  it("adds required scenarios without backfilling Actions onto baseline Tickets", async () => {
    db.seed("baseline");
    const baseline = await snapshot();
    db.seed();
    const state = await snapshot();
    for (const ticket of baseline.tickets) {
      expect(state.tickets.find(x => x.id === ticket.id)).toEqual(ticket);
      expect(state.actions.filter(x => x.ticketId === ticket.id)).toHaveLength(0);
    }
    expect(new Set(state.tickets.map(x => x.currentStatus))).toEqual(new Set([
      "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
    ]));
    expect(new Set(state.tickets.map(x => x.itPriority))).toEqual(new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]));
    expect(new Set(state.actions.map(x => x.status))).toEqual(new Set(["PLANNED", "COMPLETED", "CANCELLED"]));
    expect(state.actions.some(x => x.assignedToId === null)).toBe(true);
    expect(state.actions.some(x => x.assignedToId !== null)).toBe(true);
    expect(state.actions.some(x => x.followUpRequired && Boolean(x.followUpNote?.trim()))).toBe(true);
    expect(state.actions.some(x => !x.followUpRequired)).toBe(true);
    const counts = state.tickets.map(t => state.actions.filter(a => a.ticketId === t.id).length);
    expect(counts).toContain(0); expect(counts).toContain(1); expect(counts.some(n => n > 1)).toBe(true);
    expect(state.actions.some(a => {
      const owner = state.tickets.find(t => t.id === a.ticketId)?.assignedStaffId;
      return owner !== null && owner !== undefined && owner !== a.performedById;
    })).toBe(true);
    const empty = state.users.find(x => x.email === "lab4.empty@toktickit.local")!;
    expect(state.tickets.filter(x => x.requesterId === empty.id)).toHaveLength(0);
    const admin = state.users.find(x => x.email === "lab4.admin@toktickit.local")!;
    expect(state.actions.some(x => x.status === "PLANNED" && x.assignedToId === admin.id)).toBe(true);
    for (const action of state.actions) {
      const actor = state.users.find(x => x.id === action.performedById)!;
      expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(actor.role);
      if (action.assignedToId !== null) {
        const assignee = state.users.find(x => x.id === action.assignedToId)!;
        expect(assignee.isActive).toBe(true);
        expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(assignee.role);
      }
      expect(state.events.filter(x => x.actionId === action.id)).toHaveLength(1);
      expect(state.requests.filter(x => x.actionId === action.id)).toHaveLength(1);
    }
  });

  it("is byte/field-stable on repeated runs, including timestamps, revisions, hashes and evidence", async () => {
    const before = await snapshot();
    db.seed(); db.seed();
    expect(await snapshot()).toEqual(before);
  });

  it("serializes concurrent first-run seeds without duplicate fixtures or audit/retry evidence", async () => {
    const isolated = await createTestDatabase();
    try {
      isolated.deployThrough();
      const run = () => promisify(execFile)(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
        env: { ...isolated.env, TOKTICKIT_SEED_SCOPE: "all" },
      });
      await Promise.all([run(), run()]);
      expect(await isolated.client.ticket.count()).toBe(23);
      expect(await isolated.client.actionTaken.count()).toBe(8);
      expect(await isolated.client.actionAuditEvent.count()).toBe(8);
      expect(await isolated.client.actionCreationRequest.count()).toBe(8);
      expect(await isolated.client.comment.count()).toBe(1);
      expect(await isolated.client.internalNote.count()).toBe(1);
    } finally { await isolated.dispose(); }
  });

  it("preserves edits to seeded accounts, references, Tickets, Actions and unrelated conversation/file records", async () => {
    const user = await db.client.user.findUniqueOrThrow({ where: { email: "alex.t@toktickit.local" } });
    await db.client.user.update({ where: { id: user.id }, data: {
      passwordHash: "existing-user-password-hash", mustChangePassword: false, isActive: false, role: "REQUESTER", name: "Changed by user",
    } });
    const ticket = await db.client.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2026-000001" } });
    await db.client.ticket.update({ where: { id: ticket.id }, data: {
      summary: "User-edited summary", currentStatus: "REOPENED", assignedStaffId: null, itPriority: "URGENT", workflowRevision: 17,
    } });
    await db.client.category.update({ where: { id: ticket.categoryId }, data: { isActive: false } });
    await db.client.relatedSystem.update({ where: { id: ticket.relatedSystemId }, data: { isActive: false } });
    await db.client.comment.create({ data: { ticketId: ticket.id, authorId: user.id, content: "Unrelated conversation survives." } });
    await db.client.internalNote.create({ data: { ticketId: ticket.id, authorId: user.id, content: "Unrelated private diagnostic record survives." } });
    await db.client.attachment.create({ data: {
      ticketId: ticket.id, filename: "existing.pdf", storedFilename: "existing-fixture.pdf", filePath: "preserved/existing-fixture.pdf",
      mimeType: "application/pdf", fileSize: 123, isRemoved: true, removalReason: "Preserved evidence", removedAt: new Date("2026-01-01"), removedByRequesterId: user.id,
    } });
    const action = await db.client.actionTaken.findFirstOrThrow({ where: { status: "COMPLETED" } });
    await db.client.actionTaken.update({ where: { id: action.id }, data: { result: "Audited correction retained", followUpRequired: false } });
    await db.client.actionAuditEvent.create({ data: { actionId: action.id, actorId: action.performedById, eventType: "CORRECTED", changedFields: { result: "Audited correction retained" } } });
    await db.client.ticket.update({ where: { id: action.ticketId }, data: { workflowRevision: { increment: 1 } } });
    const before = await snapshot();
    db.seed();
    expect(await snapshot()).toEqual(before);
  });
});
