import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { createTestDatabase, TestDatabase, validatedSchemaUrl } from "./migrationTestDatabase.js";

let db: TestDatabase;
let ticketId: number;
let creatorId: number;
let otherId: number;
beforeAll(async () => {
  db = await createTestDatabase();
  db.deployThrough();
  db.seed("baseline");
  ticketId = (await db.client.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2026-000001" } })).id;
  creatorId = (await db.client.user.findUniqueOrThrow({ where: { email: "alex.t@toktickit.local" } })).id;
  otherId = (await db.client.user.findUniqueOrThrow({ where: { email: "kevin.p@toktickit.local" } })).id;
});
afterAll(async () => { if (db) await db.dispose(); });
const create = (data: Partial<Prisma.ActionTakenUncheckedCreateInput> = {}) => db.client.actionTaken.create({ data: {
  ticketId, performedById: creatorId, description: "Inspect workstation", ...data,
} });

describe("Lab 4 persistence integrity (not API/workflow implementation)", () => {
  it("rejects development database and unmanaged schemas before mutation", () => {
    expect(() => validatedSchemaUrl("postgresql://localhost/toktickit", `lab4_test_${"a".repeat(32)}`)).toThrow("SAFETY BLOCK");
    for (const schema of ["public", "lab4_test_bad", 'public"; DROP SCHEMA public; --']) {
      expect(() => validatedSchemaUrl("postgresql://localhost/toktickit_test", schema)).toThrow("SAFETY BLOCK");
    }
  });

  it("stores null assignment and distinct owner/performer/assignee without changing the Ticket", async () => {
    const ticket = await db.client.ticket.findUniqueOrThrow({ where: { id: ticketId } });
    const action = await create({ performedById: otherId, assignedToId: creatorId });
    expect(action.performedById).not.toBe(ticket.assignedStaffId);
    expect(action.assignedToId).toBe(creatorId);
    expect((await create()).assignedToId).toBeNull();
    expect(await db.client.ticket.findUnique({ where: { id: ticketId } })).toEqual(ticket);
  });

  it("rejects orphan Ticket/creator/assignee relations", async () => {
    for (const data of [{ ticketId: -1 }, { performedById: -1 }, { assignedToId: -1 }]) {
      await expect(create(data)).rejects.toThrow();
    }
  });

  it.each([
    { description: " \t\n " }, { description: "x".repeat(2001) },
    { result: "x".repeat(2001) }, { followUpNote: "x".repeat(1001) },
    { attachmentNotes: "x".repeat(1001) }, { status: "COMPLETED" as const, result: null },
    { status: "CANCELLED" as const, result: " \t " },
    { followUpRequired: true, followUpNote: null }, { followUpRequired: true, followUpNote: "\n\t" },
  ])("rejects invalid Action fields %#", async (data) => {
    await expect(create(data)).rejects.toThrow();
  });

  it("accepts approved maxima, one-character description, terminal Results and conditional notes", async () => {
    expect((await create({ description: "x" })).description).toBe("x");
    for (const status of ["COMPLETED", "CANCELLED"] as const) {
      const action = await create({ status, description: "x".repeat(2000), result: "r".repeat(2000),
        followUpRequired: true, followUpNote: "n".repeat(1000), attachmentNotes: "a".repeat(1000) });
      expect(action.status).toBe(status);
    }
  });

  it("has exactly the three Action states and rejects unknown values", async () => {
    const states = await db.client.$queryRaw<Array<{ value: string }>>`
      SELECT e.enumlabel AS value FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
      JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE t.typname='ActionStatus' AND n.nspname=${db.schema} ORDER BY e.enumsortorder`;
    expect(states.map(x => x.value)).toEqual(["PLANNED", "COMPLETED", "CANCELLED"]);
    await expect(db.client.$executeRaw`UPDATE actions_taken SET status='IN_PROGRESS' WHERE id=-1`).rejects.toThrow();
  });

  it("keeps creation identity/time immutable and ordering stable after edits", async () => {
    const action = await create();
    expect(action.createdAt).toBeInstanceOf(Date);
    for (const data of [{ performedById: otherId }, { ticketId: -1 }, { createdAt: new Date(0) }]) {
      await expect(db.client.actionTaken.update({ where: { id: action.id }, data })).rejects.toThrow();
    }
    const order = () => db.client.actionTaken.findMany({ where: { ticketId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true } });
    const before = await order();
    await db.client.actionTaken.update({ where: { id: action.id }, data: { result: "New finding" } });
    expect(await order()).toEqual(before);
    expect((await db.client.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).createdAt).toEqual(action.createdAt);
  });

  it("stores minimal append-only actor events and rejects mutation/deletion/orphans", async () => {
    const action = await create();
    const event = await db.client.actionAuditEvent.create({ data: {
      actionId: action.id, actorId: otherId, eventType: "UPDATED", changedFields: { result: { from: null, to: "Finding" } },
    } });
    expect(event.actorId).not.toBe(action.performedById);
    expect(event.changedFields).toEqual({ result: { from: null, to: "Finding" } });
    await expect(db.client.actionAuditEvent.update({ where: { id: event.id }, data: { actorId: creatorId } })).rejects.toThrow();
    await expect(db.client.actionAuditEvent.delete({ where: { id: event.id } })).rejects.toThrow();
    await expect(db.client.actionAuditEvent.create({ data: { actionId: -1, actorId: otherId, eventType: "CREATED", changedFields: {} } })).rejects.toThrow();
    await expect(db.client.actionAuditEvent.create({ data: { actionId: action.id, actorId: -1, eventType: "CREATED", changedFields: {} } })).rejects.toThrow();
    await expect(db.client.actionAuditEvent.create({ data: { actionId: action.id, actorId: otherId, eventType: "CREATED", changedFields: [] } })).rejects.toThrow();
  });

  it("anchors unique retry keys to creator/Ticket and preserves the original result after edits", async () => {
    const action = await create();
    const requestHash = createHash("sha256").update("original payload").digest("hex");
    const originalResult = { action: { id: action.id, result: null }, workflowRevision: 1 };
    const data = { actionId: action.id, ticketId, creatorId, requestKey: "same-operation", requestHash, originalResult };
    const request = await db.client.actionCreationRequest.create({ data });
    const another = await create();
    await expect(db.client.actionCreationRequest.create({ data: { ...data, actionId: another.id } })).rejects.toThrow();
    await expect(db.client.actionCreationRequest.create({ data: { ...data, actionId: another.id, creatorId: otherId, requestKey: "wrong-creator" } })).rejects.toThrow();
    const otherCreator = await create({ performedById: otherId });
    await db.client.actionCreationRequest.create({ data: { ...data, actionId: otherCreator.id, creatorId: otherId } });
    await db.client.actionTaken.update({ where: { id: action.id }, data: { result: "Later edit" } });
    expect((await db.client.actionCreationRequest.findUniqueOrThrow({ where: { id: request.id } })).originalResult).toEqual(originalResult);
    await expect(db.client.actionCreationRequest.update({ where: { id: request.id }, data: { originalResult: {} } })).rejects.toThrow();
    await expect(db.client.actionCreationRequest.delete({ where: { id: request.id } })).rejects.toThrow();
  });

  it("protects evidence-bearing relations and rejects negative workflow revisions", async () => {
    await create();
    await expect(db.client.ticket.delete({ where: { id: ticketId } })).rejects.toThrow();
    await expect(db.client.user.delete({ where: { id: creatorId } })).rejects.toThrow();
    await expect(db.client.ticket.update({ where: { id: ticketId }, data: { workflowRevision: -1 } })).rejects.toThrow();
  });

  it("creates the composite indexes needed by ordering, My Actions and gate queries", async () => {
    const indexes = await db.client.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=${db.schema}`;
    for (const name of ["actions_taken_ticketId_createdAt_id_idx", "actions_taken_assignedToId_status_idx",
      "actions_taken_ticketId_status_followUpRequired_idx", "action_audit_events_actionId_timestamp_id_idx",
      "action_creation_requests_creatorId_ticketId_requestKey_key"]) {
      expect(indexes.some(x => x.indexname === name)).toBe(true);
    }
    expect(indexes.find(x => x.indexname === "actions_taken_ticketId_createdAt_id_idx")?.indexdef)
      .toContain('(\"ticketId\", \"createdAt\", id)');
  });
});
