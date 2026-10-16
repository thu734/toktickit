import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import type { ActionStatus } from "@prisma/client";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

// Uses the configured tests/setup.ts schema; never creates its own client or DB.
// Keep these cases sequential: account-state cases restore seeded users in finally.
type Agent = ReturnType<typeof request.agent>;
type Body = Record<string, unknown>;
const csrf = { "X-Requested-With": "XMLHttpRequest" };
const initialPassword = "Initial123!";
const changedPassword = "NewPassword123!";
const path = (ticketId: number, actionId?: number) =>
  `/api/tickets/${ticketId}/actions-taken${actionId === undefined ? "" : `/${actionId}`}`;

const invalidFields: Array<{ name: string; body: Body }> = [
  { name: "blank description", body: { description: " \t\n " } },
  { name: "empty description", body: { description: "" } },
  { name: "null description", body: { description: null } },
  { name: "numeric description", body: { description: 1 } },
  { name: "object description", body: { description: {} } },
  { name: "array description", body: { description: ["work"] } },
  { name: "description over 2000", body: { description: "d".repeat(2001) } },
  { name: "result over 2000", body: { result: "r".repeat(2001) } },
  { name: "null result", body: { result: null } },
  { name: "numeric result", body: { result: 1 } },
  { name: "boolean result", body: { result: true } },
  { name: "object result", body: { result: {} } },
  { name: "array result", body: { result: ["done"] } },
  { name: "string follow-up flag", body: { followUpRequired: "false" } },
  { name: "numeric follow-up flag", body: { followUpRequired: 0 } },
  { name: "null follow-up flag", body: { followUpRequired: null } },
  { name: "object follow-up flag", body: { followUpRequired: {} } },
  { name: "array follow-up flag", body: { followUpRequired: [] } },
  { name: "required note omitted", body: { followUpRequired: true } },
  { name: "required note blank", body: { followUpRequired: true, followUpNote: " \n\t " } },
  { name: "required note null", body: { followUpRequired: true, followUpNote: null } },
  { name: "required note over 1000", body: { followUpRequired: true, followUpNote: "n".repeat(1001) } },
  { name: "optional note over 1000", body: { followUpRequired: false, followUpNote: "n".repeat(1001) } },
  { name: "null optional note", body: { followUpNote: null } },
  { name: "numeric note", body: { followUpNote: 1 } },
  { name: "boolean note", body: { followUpNote: false } },
  { name: "object note", body: { followUpNote: {} } },
  { name: "array note", body: { followUpNote: ["note"] } },
  { name: "attachment notes over 1000", body: { attachmentNotes: "a".repeat(1001) } },
  { name: "null attachment notes", body: { attachmentNotes: null } },
  { name: "numeric attachment notes", body: { attachmentNotes: 1 } },
  { name: "boolean attachment notes", body: { attachmentNotes: true } },
  { name: "object attachment notes", body: { attachmentNotes: {} } },
  { name: "array attachment notes", body: { attachmentNotes: ["file"] } },
];

describe("Lab 4 focused Actions API contract (AC-01 through AC-11, AC-16)", () => {
  let staff: Agent;
  let admin: Agent;
  let requester: Agent;
  let staffId: number;
  let adminId: number;
  let requesterId: number;
  let otherRequesterId: number;
  let otherStaffId: number;
  let inactiveStaffId: number;
  let missingUserId: number;
  let categoryId: number;
  let relatedSystemId: number;

  async function login(email: string, password = changedPassword) {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").set(csrf).send({ email, password }).expect(200);
    return agent;
  }

  async function unlock(email: string) {
    const agent = await login(email, initialPassword);
    await agent.post("/api/auth/change-password").set(csrf).send({
      currentPassword: initialPassword, newPassword: changedPassword, confirmPassword: changedPassword,
    }).expect(200);
    return agent;
  }

  beforeAll(async () => {
    // Fail closed before any fixture writes if this file bypasses the shared setup.
    const target = new URL(process.env.DATABASE_URL!);
    expect(target.pathname).toBe("/toktickit_test");
    expect(target.searchParams.get("schema")).toMatch(/^lab4_test_[a-f0-9]{32}$/);
    expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
    const prisma = getPrisma();
    const user = (email: string) => prisma.user.findUniqueOrThrow({ where: { email } });
    staffId = (await user("alex.t@toktickit.local")).id;
    adminId = (await user("admin@toktickit.local")).id;
    requesterId = (await user("jennifer.a@toktickit.local")).id;
    otherRequesterId = (await user("michael.b@toktickit.local")).id;
    otherStaffId = (await user("kevin.p@toktickit.local")).id;
    inactiveStaffId = (await user("inactive.staff@toktickit.local")).id;
    missingUserId = (await prisma.user.aggregate({ _max: { id: true } }))._max.id! + 10000;
    categoryId = (await prisma.category.findFirstOrThrow()).id;
    relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow()).id;
    staff = await unlock("alex.t@toktickit.local");
    admin = await unlock("admin@toktickit.local");
    requester = await unlock("jennifer.a@toktickit.local");
    await unlock("kevin.p@toktickit.local");
  });

  async function ticket(owner = requesterId) {
    return getPrisma().ticket.create({ data: {
      ticketNumber: `ACT-CONTRACT-${randomUUID()}`,
      summary: "Independent Actions contract fixture",
      description: "Disposable test ticket in the setup-owned random schema.",
      requesterId: owner, assignedStaffId: adminId, categoryId, relatedSystemId,
      requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "OPEN",
    } });
  }

  function createBody(body: Body = {}): Body {
    return { workflowRevision: 0, requestKey: randomUUID(), description: "Inspect workstation", ...body };
  }

  async function create(ticketId: number, body: Body = {}, agent = staff) {
    return agent.post(path(ticketId)).set(csrf).send(createBody(body)).expect(201);
  }

  async function fixture(status: ActionStatus = "PLANNED", body: Body = {}) {
    const parent = await ticket();
    const created = await create(parent.id, body);
    if (status === "PLANNED") return { ticketId: parent.id, action: created.body.action, revision: 1 };
    const transitioned = await staff.patch(path(parent.id, created.body.action.id)).set(csrf)
      .send({ workflowRevision: 1, status, result: "Recorded final result" }).expect(200);
    expect(transitioned.body.workflowRevision).toBe(2);
    return { ticketId: parent.id, action: transitioned.body.action, revision: 2 };
  }

  async function snapshot(ticketId: number) {
    const prisma = getPrisma();
    return {
      ticket: await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } }),
      actions: await prisma.actionTaken.findMany({ where: { ticketId }, orderBy: { id: "asc" } }),
      events: await prisma.actionAuditEvent.findMany({ where: { action: { ticketId } }, orderBy: { id: "asc" } }),
      requests: await prisma.actionCreationRequest.findMany({ where: { ticketId }, orderBy: { id: "asc" } }),
    };
  }

  function error(response: request.Response, status: number, code: string) {
    expect(response.status).toBe(status);
    expect(response.body.code).toBe(code);
    expect(typeof response.body.error).toBe("string");
    // Error wording is inherited, not invented here. Exact envelopes are asserted
    // below only where the current inherited response is known.
    expect(response.body).not.toHaveProperty("stack");
    expect(response.body).not.toHaveProperty("passwordHash");
  }

  for (const method of ["POST", "PATCH"] as const) {
    describe(`${method} field validation`, () => {
      async function target() {
        if (method === "PATCH") {
          const value = await fixture();
          return { ticketId: value.ticketId, url: path(value.ticketId, value.action.id), revision: value.revision };
        }
        const parent = await ticket();
        return { ticketId: parent.id, url: path(parent.id), revision: 0 };
      }

      function send(url: string, revision: number, body: Body) {
        return method === "POST"
          ? staff.post(url).set(csrf).send(createBody({ workflowRevision: revision, ...body }))
          : staff.patch(url).set(csrf).send({ workflowRevision: revision, ...body });
      }

      it.each(invalidFields)("rejects $name without mutation", async ({ body }) => {
        const value = await target();
        const before = await snapshot(value.ticketId);
        error(await send(value.url, value.revision, body), 400, "VALIDATION_ERROR");
        expect(await snapshot(value.ticketId)).toEqual(before);
      });

      it.each([1, 1999, 2000])("accepts description/result length %i after trimming", async (length) => {
        const value = await target();
        const body = { description: `  ${"d".repeat(length)}  `, result: `  ${"r".repeat(length)}  ` };
        const response = await send(value.url, value.revision, body).expect(method === "POST" ? 201 : 200);
        expect(response.body.action.description).toBe("d".repeat(length));
        expect(response.body.action.result).toBe("r".repeat(length));
        expect(response.body.workflowRevision).toBe(value.revision + 1);
        expect((await snapshot(value.ticketId)).actions[0]).toMatchObject({
          description: "d".repeat(length), result: "r".repeat(length),
        });
      });

      it.each([1, 999, 1000])("accepts follow-up/attachment note length %i after trimming", async (length) => {
        const value = await target();
        const response = await send(value.url, value.revision, {
          followUpRequired: true, followUpNote: `  ${"n".repeat(length)}  `,
          attachmentNotes: `  ${"a".repeat(length)}  `,
        }).expect(method === "POST" ? 201 : 200);
        expect(response.body.action).toMatchObject({
          followUpRequired: true, followUpNote: "n".repeat(length), attachmentNotes: "a".repeat(length),
        });
        expect(response.body.workflowRevision).toBe(value.revision + 1);
      });

      it("allows blank optional text with follow-up false on PLANNED work", async () => {
        const value = await target();
        const response = await send(value.url, value.revision, {
          result: " \t ", followUpRequired: false, followUpNote: " \n ", attachmentNotes: "  ",
        }).expect(method === "POST" ? 201 : 200);
        expect(response.body.action.status).toBe("PLANNED");
        expect(response.body.action.followUpRequired).toBe(false);
        const stored = (await snapshot(value.ticketId)).actions[0];
        for (const field of ["result", "followUpNote", "attachmentNotes"] as const) {
          expect(stored[field]).toBeNull();
          expect(response.body.action[field]).toBeNull();
        }
      });

      it.each([
        { name: "missing", value: undefined }, { name: "null", value: null },
        { name: "empty string", value: "" }, { name: "whitespace", value: " " },
        { name: "numeric string", value: "0" }, { name: "false", value: false },
        { name: "true", value: true }, { name: "array", value: [] },
        { name: "object", value: {} }, { name: "negative", value: -1 },
        { name: "fraction", value: 0.5 },
      ])("requires a numeric integer workflow revision: $name", async ({ name, value: revision }) => {
        const value = await target();
        const before = await snapshot(value.ticketId);
        // A coercible string must represent the CURRENT revision, so a stale
        // conflict cannot accidentally satisfy this type-validation case.
        const workflowRevision = name === "numeric string" ? String(value.revision) : revision;
        error(await send(value.url, value.revision, { workflowRevision }), 400, "INVALID_WORKFLOW_REVISION");
        expect(await snapshot(value.ticketId)).toEqual(before);
      });

      it.each([
        { name: "numeric string", value: "1" }, { name: "empty string", value: "" },
        { name: "whitespace", value: " " }, { name: "false", value: false },
        { name: "true", value: true }, { name: "array", value: [1] },
        { name: "object", value: {} }, { name: "zero", value: 0 },
        { name: "negative", value: -1 }, { name: "fraction", value: 1.5 },
      ])("rejects non-ID assignee $name", async ({ name, value: invalidId }) => {
        const value = await target();
        const before = await snapshot(value.ticketId);
        // Use an eligible real ID inside coercible values; an ineligible target
        // would mask accidental Number(...) coercion with the same error code.
        const assignedToId = name === "numeric string" ? String(staffId) : name === "array" ? [staffId] : invalidId;
        error(await send(value.url, value.revision, { assignedToId }), 400, "INVALID_ASSIGNEE");
        expect(await snapshot(value.ticketId)).toEqual(before);
      });

      it.each(["inactive", "requester", "missing"] as const)("rejects %s assignee", async (kind) => {
        const value = await target();
        const before = await snapshot(value.ticketId);
        const assignedToId = kind === "inactive" ? inactiveStaffId : kind === "requester" ? requesterId : missingUserId;
        error(await send(value.url, value.revision, { assignedToId }), 400, "INVALID_ASSIGNEE");
        expect(await snapshot(value.ticketId)).toEqual(before);
      });
    });
  }

  it("requires a description on creation and returns exact defaults for omitted optional fields", async () => {
    const parent = await ticket();
    const before = await snapshot(parent.id);
    error(await staff.post(path(parent.id)).set(csrf).send(createBody({ description: undefined })), 400, "VALIDATION_ERROR");
    expect(await snapshot(parent.id)).toEqual(before);
    const response = await create(parent.id);
    expect(response.body).toEqual({ action: {
      id: expect.any(Number), ticketId: parent.id, performedById: staffId, assignedToId: null,
      status: "PLANNED", description: "Inspect workstation", result: null,
      followUpRequired: false, followUpNote: null, attachmentNotes: null,
      createdAt: expect.any(String), updatedAt: expect.any(String),
      performedBy: { id: staffId, name: expect.any(String), email: "alex.t@toktickit.local", role: "IT_STAFF" },
      assignedTo: null,
    }, workflowRevision: 1 });
  });

  it.each([
    { name: "missing", value: undefined }, { name: "null", value: null },
    { name: "empty", value: "" }, { name: "blank", value: " \t " },
    { name: "number", value: 1 }, { name: "boolean", value: true },
    { name: "object", value: {} }, { name: "array", value: [] },
    { name: "over 255", value: "k".repeat(256) },
  ])("rejects invalid creation request key: $name", async ({ value: requestKey }) => {
    const parent = await ticket();
    const before = await snapshot(parent.id);
    error(await staff.post(path(parent.id)).set(csrf).send(createBody({ requestKey })), 400, "INVALID_REQUEST_KEY");
    expect(await snapshot(parent.id)).toEqual(before);
  });

  it.each([1, 255])("accepts request-key length %i", async (length) => {
    const parent = await ticket();
    const response = await create(parent.id, { requestKey: "k".repeat(length) });
    expect(response.body.workflowRevision).toBe(1);
    expect((await snapshot(parent.id)).requests[0].requestKey).toBe("k".repeat(length));
  });

  it.each(["staff", "admin"] as const)("uses %s session identity despite forged POST fields/headers", async (role) => {
    const parent = await ticket();
    const otherParent = await ticket();
    const agent = role === "staff" ? staff : admin;
    const actorId = role === "staff" ? staffId : adminId;
    const forgedId = role === "staff" ? adminId : staffId;
    const forgedTime = "2000-01-01T00:00:00.000Z";
    const response = await agent.post(path(parent.id)).set(csrf)
      .set("X-Development-Requester-Id", String(forgedId)).send(createBody({
        performedById: forgedId, performedBy: { id: forgedId }, actorId: forgedId,
        ticketId: otherParent.id, id: 999999, createdAt: forgedTime, updatedAt: forgedTime,
        actionDateTime: forgedTime, status: "CANCELLED", assignedToId: otherStaffId, result: "  Preliminary finding  ",
      })).expect(201);
    expect(response.body.action).toMatchObject({
      ticketId: parent.id, performedById: actorId, assignedToId: otherStaffId,
      result: "Preliminary finding", status: "PLANNED",
    });
    expect(response.body.action.createdAt).not.toBe(forgedTime);
    expect(response.body.action.updatedAt).not.toBe(forgedTime);
    expect(response.body.action.id).not.toBe(999999);
    expect(Number.isNaN(Date.parse(response.body.action.createdAt))).toBe(false);
    expect(response.body.action.performedBy).toEqual({
      id: actorId, name: expect.any(String),
      email: role === "staff" ? "alex.t@toktickit.local" : "admin@toktickit.local",
      role: role === "staff" ? "IT_STAFF" : "ADMINISTRATOR",
    });
    expect(response.body.action.assignedTo).toEqual({
      id: otherStaffId, name: expect.any(String), email: "kevin.p@toktickit.local", role: "IT_STAFF", isActive: true,
    });
    const state = await snapshot(parent.id);
    expect(state.ticket.assignedStaffId).toBe(adminId);
    expect(state.actions).toHaveLength(1);
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({ actionId: response.body.action.id, actorId, eventType: "CREATED", timestamp: expect.any(Date) });
    expect(state.events[0].changedFields).toMatchObject({ performedById: actorId, ticketId: parent.id, result: "Preliminary finding" });
    expect((await snapshot(otherParent.id)).actions).toEqual([]);
  });

  it.each([
    ["performedById", 1], ["performedBy", { id: 1 }], ["actorId", 1], ["ticketId", 1], ["id", 1],
    ["createdAt", "2000-01-01T00:00:00.000Z"], ["updatedAt", "2000-01-01T00:00:00.000Z"],
    ["actionDateTime", "2000-01-01T00:00:00.000Z"], ["requestKey", "patch-key"], ["unexpected", true],
  ])("rejects unsupported PATCH field %s even alongside a valid edit", async (field, value) => {
    const f = await fixture();
    const before = await snapshot(f.ticketId);
    error(await admin.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: f.revision, result: "Valid edit", [field as string]: value }), 400, "INVALID_FIELDS");
    expect(await snapshot(f.ticketId)).toEqual(before);
  });

  it("allows independent Staff/Admin assignment and explicit clearing with actor audit evidence", async () => {
    const f = await fixture("PLANNED", { assignedToId: otherStaffId });
    for (const [index, assignedToId] of [adminId, staffId, null].entries()) {
      const response = await admin.patch(path(f.ticketId, f.action.id)).set(csrf)
        .send({ workflowRevision: 1 + index, assignedToId }).expect(200);
      expect(response.body.workflowRevision).toBe(2 + index);
      expect(response.body.action).toMatchObject({ assignedToId, performedById: staffId, createdAt: f.action.createdAt });
      if (assignedToId === null) expect(response.body.action.assignedTo).toBeNull();
    }
    const state = await snapshot(f.ticketId);
    expect(state.ticket.assignedStaffId).toBe(adminId);
    expect(state.events.map(event => event.eventType)).toEqual(["CREATED", "ASSIGNED", "ASSIGNED", "ASSIGNED"]);
    expect(state.events.slice(1).map(event => event.actorId)).toEqual([adminId, adminId, adminId]);
    expect(state.events.slice(1).map(event => event.changedFields)).toEqual([
      { assignedToId: adminId }, { assignedToId: staffId }, { assignedToId: null },
    ]);
  });

  it("returns 404 for an existing Action under a different existing parent", async () => {
    const f = await fixture();
    const wrong = await ticket();
    const before = await snapshot(f.ticketId);
    const wrongBefore = await snapshot(wrong.id);
    const response = await admin.patch(path(wrong.id, f.action.id)).set(csrf)
      .send({ workflowRevision: 0, result: "Wrong parent" });
    error(response, 404, "RESOURCE_NOT_FOUND");
    expect(response.body).toEqual({ error: "Not Found", code: "RESOURCE_NOT_FOUND", message: "Action not found." });
    expect(await snapshot(f.ticketId)).toEqual(before);
    expect(await snapshot(wrong.id)).toEqual(wrongBefore);
  });

  it("lets Requesters read every owned Action state, hides other owners, and prevents all mutations", async () => {
    const parent = await ticket();
    const planned = await create(parent.id);
    const completed = await create(parent.id, { workflowRevision: 1 });
    await staff.patch(path(parent.id, completed.body.action.id)).set(csrf)
      .send({ workflowRevision: 2, status: "COMPLETED", result: "Done" }).expect(200);
    const cancelled = await create(parent.id, { workflowRevision: 3 });
    await staff.patch(path(parent.id, cancelled.body.action.id)).set(csrf)
      .send({ workflowRevision: 4, status: "CANCELLED", result: "Unneeded" }).expect(200);
    const other = await ticket(otherRequesterId);
    const otherAction = await create(other.id);
    const ownBefore = await snapshot(parent.id);
    const otherBefore = await snapshot(other.id);
    const listed = await requester.get(path(parent.id)).expect(200);
    expect(listed.body).toEqual((await staff.get(path(parent.id)).expect(200)).body);
    expect(listed.body.workflowRevision).toBe(5);
    expect(listed.body.actions.map((action: { status: string }) => action.status)).toEqual(["PLANNED", "COMPLETED", "CANCELLED"]);
    const hidden = await requester.get(path(other.id));
    error(hidden, 404, "RESOURCE_NOT_FOUND");
    const missingId = (await getPrisma().ticket.aggregate({ _max: { id: true } }))._max.id! + 10000;
    const missing = await requester.get(path(missingId)).expect(404);
    expect(hidden.body).toEqual(missing.body);
    for (const body of [
      { description: "Changed" }, { assignedToId: staffId },
      { status: "COMPLETED", result: "Done" }, { status: "CANCELLED", result: "Cancelled" },
    ]) {
      error(await requester.patch(path(parent.id, planned.body.action.id)).set(csrf)
        .set("X-Development-Requester-Id", String(adminId)).send({ workflowRevision: 5, ...body }), 403, "FORBIDDEN");
    }
    error(await requester.post(path(parent.id)).set(csrf).send(createBody({ workflowRevision: 5 })), 403, "FORBIDDEN");
    error(await requester.post(path(other.id)).set(csrf).send(createBody()), 404, "RESOURCE_NOT_FOUND");
    error(await requester.patch(path(other.id, otherAction.body.action.id)).set(csrf)
      .send({ workflowRevision: 1, result: "Hidden edit" }), 404, "RESOURCE_NOT_FOUND");
    expect(await snapshot(parent.id)).toEqual(ownBefore);
    expect(await snapshot(other.id)).toEqual(otherBefore);
  });

  it.each([false, true])("requires sessions for GET/POST/PATCH (legacy header: %s)", async (withHeader) => {
    const f = await fixture();
    const before = await snapshot(f.ticketId);
    for (const operation of [
      request(app).get(path(f.ticketId)),
      request(app).post(path(f.ticketId)).set(csrf).send(createBody({ workflowRevision: 1 })),
      request(app).patch(path(f.ticketId, f.action.id)).set(csrf).send({ workflowRevision: 1, result: "No session" }),
    ]) {
      if (withHeader) operation.set("X-Development-Requester-Id", String(adminId));
      const response = await operation.expect(401);
      expect(response.body).toEqual({ error: "Authentication required. Please log in.", code: "UNAUTHENTICATED" });
    }
    expect(await snapshot(f.ticketId)).toEqual(before);
  });

  it("blocks all Actions endpoints for a legitimately authenticated first-password-locked Staff user", async () => {
    const f = await fixture();
    const before = await snapshot(f.ticketId);
    const locked = await login("emily.d@toktickit.local", initialPassword);
    error(await locked.get(path(f.ticketId)), 403, "MUST_CHANGE_PASSWORD");
    error(await locked.post(path(f.ticketId)).set(csrf).send(createBody({ workflowRevision: 1 })), 403, "MUST_CHANGE_PASSWORD");
    error(await locked.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: 1, result: "Locked edit" }), 403, "MUST_CHANGE_PASSWORD");
    expect(await snapshot(f.ticketId)).toEqual(before);
  });

  it.each(["deactivation", "demotion"] as const)("rechecks an established session after %s, including identical replay", async (change) => {
    const agent = await login("kevin.p@toktickit.local");
    const replayAgent = await login("kevin.p@toktickit.local");
    const createAgent = await login("kevin.p@toktickit.local");
    const patchAgent = await login("kevin.p@toktickit.local");
    // Give the demoted account ownership so mutation denial tests role, not 404.
    const parent = await ticket(otherStaffId);
    const body = createBody();
    const original = await agent.post(path(parent.id)).set(csrf).send(body).expect(201);
    const foreign = await ticket();
    const before = await snapshot(parent.id);
    const saved = await getPrisma().user.findUniqueOrThrow({ where: { id: otherStaffId } });
    try {
      await getPrisma().user.update({ where: { id: otherStaffId }, data:
        change === "deactivation" ? { isActive: false } : { role: "REQUESTER" } });
      if (change === "demotion") {
        const read = await agent.get(path(parent.id)).expect(200);
        expect(read.body).toEqual({ actions: [{
          ...original.body.action,
          performedBy: { ...original.body.action.performedBy, role: "REQUESTER" },
        }], workflowRevision: 1 });
        error(await agent.get(path(foreign.id)), 404, "RESOURCE_NOT_FOUND");
      } else {
        error(await agent.get(path(parent.id)), 401, "UNAUTHENTICATED");
      }
      const status = change === "deactivation" ? 401 : 403;
      const code = change === "deactivation" ? "UNAUTHENTICATED" : "FORBIDDEN";
      // Separate pre-existing sessions ensure each endpoint checks current account
      // state, even if another rejected request has already destroyed its session.
      error(await replayAgent.post(path(parent.id)).set(csrf).send(body), status, code);
      error(await createAgent.post(path(parent.id)).set(csrf).send(createBody({ workflowRevision: 1 })), status, code);
      error(await patchAgent.patch(path(parent.id, original.body.action.id)).set(csrf)
        .send({ workflowRevision: 1, result: "Revoked edit" }), status, code);
      expect(await snapshot(parent.id)).toEqual(before);
    } finally {
      await getPrisma().user.update({ where: { id: otherStaffId }, data: { role: saved.role, isActive: saved.isActive } });
    }
  });

  const states: ActionStatus[] = ["PLANNED", "COMPLETED", "CANCELLED"];
  it.each(states.flatMap(from => states.map(to => ({ from, to }))))("enforces transition $from -> $to", async ({ from, to }) => {
    const f = await fixture(from);
    const before = await snapshot(f.ticketId);
    const response = await admin.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: f.revision, status: to, result: "Transition result" });
    if (from === "PLANNED" && to !== "PLANNED") {
      expect(response.status).toBe(200);
      expect(response.body.workflowRevision).toBe(f.revision + 1);
      expect(response.body.action).toMatchObject({ status: to, result: "Transition result", performedById: staffId, createdAt: f.action.createdAt });
      const after = await snapshot(f.ticketId);
      expect(after.events).toHaveLength(before.events.length + 1);
      expect(after.events.at(-1)).toMatchObject({ actionId: f.action.id, actorId: adminId, eventType: to, timestamp: expect.any(Date),
        changedFields: { status: to, result: "Transition result" } });
      expect(after.events.slice(0, -1)).toEqual(before.events);
    } else {
      error(response, 400, "INVALID_TRANSITION");
      expect(await snapshot(f.ticketId)).toEqual(before);
    }
  });

  it.each(["COMPLETED", "CANCELLED"] as const)("requires a final result for %s and can use an existing planned result", async (status) => {
    const f = await fixture();
    const before = await snapshot(f.ticketId);
    for (const result of [undefined, "", " \t\n "]) {
      error(await staff.patch(path(f.ticketId, f.action.id)).set(csrf)
        .send({ workflowRevision: 1, status, result }), 400, "VALIDATION_ERROR");
      expect(await snapshot(f.ticketId)).toEqual(before);
    }
    const prepared = await admin.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: 1, result: "Existing finding" }).expect(200);
    expect(prepared.body.workflowRevision).toBe(2);
    const final = await staff.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: 2, status }).expect(200);
    expect(final.body.action).toMatchObject({ status, result: "Existing finding" });
    expect(final.body.workflowRevision).toBe(3);
  });

  it("validates follow-up against retained fields and permits clearing flag and note together", async () => {
    const f = await fixture("PLANNED", { followUpRequired: true, followUpNote: "Retained note" });
    const before = await snapshot(f.ticketId);
    error(await staff.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: 1, followUpNote: " " }), 400, "VALIDATION_ERROR");
    expect(await snapshot(f.ticketId)).toEqual(before);
    const cleared = await admin.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: 1, followUpRequired: false, followUpNote: " " }).expect(200);
    expect(cleared.body.action).toMatchObject({ followUpRequired: false, followUpNote: null });
    const after = await snapshot(f.ticketId);
    error(await staff.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: 2, followUpRequired: true }), 400, "VALIDATION_ERROR");
    expect(await snapshot(f.ticketId)).toEqual(after);
  });

  it.each(["staff", "admin"] as const)("allows all approved COMPLETED corrections by %s with minimal audit deltas", async (role) => {
    const f = await fixture("COMPLETED", { assignedToId: otherStaffId, followUpRequired: true, followUpNote: "Original follow-up" });
    const before = await snapshot(f.ticketId);
    const agent = role === "staff" ? staff : admin;
    const correction = { result: "Corrected result", followUpRequired: true, followUpNote: "Corrected follow-up", attachmentNotes: "Existing file evidence" };
    const response = await agent.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: 2, ...correction }).expect(200);
    expect(response.body).toEqual({ action: { ...f.action, ...correction, updatedAt: expect.any(String) }, workflowRevision: 3 });
    const cleared = await agent.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: 3, followUpRequired: false, followUpNote: "" }).expect(200);
    expect(cleared.body.action).toMatchObject({
      status: "COMPLETED", performedById: staffId, createdAt: f.action.createdAt,
      assignedToId: otherStaffId, result: "Corrected result", followUpRequired: false, followUpNote: null,
    });
    expect(cleared.body.workflowRevision).toBe(4);
    const after = await snapshot(f.ticketId);
    expect(after.events.slice(0, before.events.length)).toEqual(before.events);
    expect(after.events).toHaveLength(4);
    for (const event of after.events.slice(2)) {
      expect(event).toMatchObject({ actionId: f.action.id, actorId: role === "staff" ? staffId : adminId, eventType: "CORRECTED", timestamp: expect.any(Date) });
    }
    expect(after.events[2].changedFields).toEqual(correction);
    expect(after.events[3].changedFields).toEqual({ followUpRequired: false, followUpNote: null });
  });

  it.each([
    { name: "blank result", body: { result: " \n " } },
    { name: "empty result", body: { result: "" } },
    { name: "null result", body: { result: null } },
    { name: "follow-up without note", body: { followUpRequired: true } },
  ])("rejects invalid COMPLETED correction: $name", async ({ body }) => {
    const f = await fixture("COMPLETED");
    const before = await snapshot(f.ticketId);
    error(await admin.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: 2, ...body }), 400, "VALIDATION_ERROR");
    expect(await snapshot(f.ticketId)).toEqual(before);
  });

  it.each(["description", "assignedToId"] as const)("rejects COMPLETED %s edits alongside an allowed correction", async (field) => {
    const f = await fixture("COMPLETED");
    const before = await snapshot(f.ticketId);
    error(await admin.patch(path(f.ticketId, f.action.id)).set(csrf).send({
      workflowRevision: 2, result: "Valid correction", [field]: field === "description" ? "Changed description" : adminId,
    }), 400, "IMMUTABLE_ACTION");
    expect(await snapshot(f.ticketId)).toEqual(before);
  });

  it.each([
    { description: "Changed" }, { result: "Corrected" }, { assignedToId: null },
    { followUpRequired: true, followUpNote: "Follow-up" }, { followUpNote: "Changed note" }, { attachmentNotes: "Evidence" },
  ])("rejects CANCELLED field edits %#", async (body) => {
    const f = await fixture("CANCELLED");
    const before = await snapshot(f.ticketId);
    error(await admin.patch(path(f.ticketId, f.action.id)).set(csrf)
      .send({ workflowRevision: 2, ...body }), 400, "IMMUTABLE_ACTION");
    expect(await snapshot(f.ticketId)).toEqual(before);
  });

  it.each(["RESOLVED", "CLOSED", "CANCELLED"] as const)("blocks new writes and completed corrections on %s parents", async (currentStatus) => {
    const f = await fixture("COMPLETED");
    const planned = await create(f.ticketId, { workflowRevision: 2 });
    await getPrisma().ticket.update({ where: { id: f.ticketId }, data: { currentStatus } });
    const before = await snapshot(f.ticketId);
    for (const agent of [staff, admin]) {
      error(await agent.post(path(f.ticketId)).set(csrf).send(createBody({ workflowRevision: 3 })), 409, "TICKET_NOT_WRITABLE");
      for (const body of [{ result: "Edit" }, { assignedToId: otherStaffId }, { status: "COMPLETED", result: "Done" }, { status: "CANCELLED", result: "Cancelled" }]) {
        error(await agent.patch(path(f.ticketId, planned.body.action.id)).set(csrf)
          .send({ workflowRevision: 3, ...body }), 409, "TICKET_NOT_WRITABLE");
      }
      error(await agent.patch(path(f.ticketId, f.action.id)).set(csrf)
        .send({ workflowRevision: 3, result: "Completed correction", followUpRequired: false }), 409, "TICKET_NOT_WRITABLE");
    }
    expect((await requester.get(path(f.ticketId)).expect(200)).body.actions).toHaveLength(2);
    expect(await snapshot(f.ticketId)).toEqual(before);
  });

  it("orders by immutable createdAt then ID, including deliberate ties, before and after edits", async () => {
    const parent = await ticket();
    const early = new Date("2025-01-01T00:00:00.000Z");
    const tie = new Date("2025-01-02T00:00:00.000Z");
    // Set creation timestamps only at INSERT, before evidence exists. Never UPDATE
    // immutable timestamps or disable triggers merely to manufacture ordering ties.
    const inserted = [];
    for (const [index, createdAt] of [tie, early, tie].entries()) {
      const action = await getPrisma().actionTaken.create({ data: {
        ticketId: parent.id, performedById: staffId, description: `Order fixture ${index}`, createdAt,
      } });
      inserted.push(action);
      await getPrisma().actionAuditEvent.create({ data: {
        actionId: action.id, actorId: staffId, eventType: "CREATED", changedFields: { description: action.description },
      } });
    }
    const expectedIds = [inserted[1].id, inserted[0].id, inserted[2].id];
    const before = await snapshot(parent.id);
    const listed = await requester.get(path(parent.id)).expect(200);
    expect(listed.body.actions.map((action: { id: number }) => action.id)).toEqual(expectedIds);
    expect(listed.body.actions.map((action: { createdAt: string }) => action.createdAt)).toEqual([early.toISOString(), tie.toISOString(), tie.toISOString()]);
    const edited = await admin.patch(path(parent.id, inserted[0].id)).set(csrf)
      .send({ workflowRevision: 0, description: "Edited tied action" }).expect(200);
    expect(edited.body.workflowRevision).toBe(1);
    expect(edited.body.action.createdAt).toBe(tie.toISOString());
    const afterList = await requester.get(path(parent.id)).expect(200);
    expect(afterList.body.actions.map((action: { id: number }) => action.id)).toEqual(expectedIds);
    const after = await snapshot(parent.id);
    expect(after.actions.map(action => action.createdAt)).toEqual(before.actions.map(action => action.createdAt));
    expect(after.events.slice(0, 3)).toEqual(before.events);
    expect(after.events).toHaveLength(4);
    expect(after.events[3]).toMatchObject({ actionId: inserted[0].id, actorId: adminId, eventType: "UPDATED", changedFields: { description: "Edited tied action" } });
  });

  it("replays the exact original body/revision after later edits without new Action, retry record, or audit", async () => {
    const parent = await ticket();
    const body = createBody({ result: "Original finding", assignedToId: adminId });
    const original = await staff.post(path(parent.id)).set(csrf).send(body).expect(201);
    const immediate = await staff.post(path(parent.id)).set(csrf).send(body).expect(201);
    expect(immediate.body).toEqual(original.body);
    await admin.patch(path(parent.id, original.body.action.id)).set(csrf)
      .send({ workflowRevision: 1, status: "COMPLETED", result: "Later final finding" }).expect(200);
    const before = await snapshot(parent.id);
    for (const workflowRevision of [0, 2]) {
      const replay = await staff.post(path(parent.id)).set(csrf).send({ ...body, workflowRevision }).expect(201);
      expect(replay.body).toEqual(original.body);
      expect(replay.body.workflowRevision).toBe(1);
      expect(replay.body.action.result).toBe("Original finding");
    }
    expect(before.actions).toHaveLength(1);
    expect(before.requests).toHaveLength(1);
    expect(before.requests[0].originalResult).toEqual(original.body);
    expect(before.events).toHaveLength(2);
    expect(before.ticket.workflowRevision).toBe(2);
    expect(await snapshot(parent.id)).toEqual(before);
  });

  it.each(["RESOLVED", "CLOSED", "CANCELLED"] as const)("replays an authorized original response on a %s parent even with a now-inactive assignee", async (currentStatus) => {
    const parent = await ticket();
    const body = createBody({ assignedToId: otherStaffId, result: "Original result" });
    const original = await staff.post(path(parent.id)).set(csrf).send(body).expect(201);
    await getPrisma().ticket.update({ where: { id: parent.id }, data: { currentStatus, workflowRevision: { increment: 1 } } });
    const saved = await getPrisma().user.findUniqueOrThrow({ where: { id: otherStaffId } });
    try {
      await getPrisma().user.update({ where: { id: otherStaffId }, data: { isActive: false } });
      const before = await snapshot(parent.id);
      const replay = await staff.post(path(parent.id)).set(csrf).send(body).expect(201);
      expect(replay.body).toEqual(original.body);
      expect(replay.body.action.assignedTo.isActive).toBe(true);
      expect(before.ticket.workflowRevision).toBe(2);
      expect(before.actions).toHaveLength(1);
      expect(before.requests).toHaveLength(1);
      expect(before.events).toHaveLength(1);
      error(await staff.post(path(parent.id)).set(csrf).send({ ...body, result: "Changed result" }), 409, "REQUEST_KEY_REUSED");
      expect(await snapshot(parent.id)).toEqual(before);
    } finally {
      await getPrisma().user.update({ where: { id: otherStaffId }, data: { isActive: saved.isActive } });
    }
  });

  it.each([
    { name: "description", changed: { description: "Different work" } },
    { name: "result", changed: { result: "Changed finding" } },
    { name: "follow-up", changed: { followUpRequired: true, followUpNote: "Required review" } },
    { name: "attachment notes", changed: { attachmentNotes: "Other evidence" } },
    { name: "assignment", changed: { assignedToId: null } },
  ])("rejects request-key reuse with changed $name", async ({ changed }) => {
    const parent = await ticket();
    const body = createBody({ result: "Original finding", assignedToId: adminId });
    await staff.post(path(parent.id)).set(csrf).send(body).expect(201);
    const before = await snapshot(parent.id);
    error(await staff.post(path(parent.id)).set(csrf)
      .send({ ...body, workflowRevision: 1, ...changed }), 409, "REQUEST_KEY_REUSED");
    expect(before.actions).toHaveLength(1);
    expect(before.events).toHaveLength(1);
    expect(before.requests).toHaveLength(1);
    expect(before.ticket.workflowRevision).toBe(1);
    expect(await snapshot(parent.id)).toEqual(before);
  });

  it("scopes creation request keys to the authenticated creator and parent", async () => {
    const first = await ticket();
    const second = await ticket();
    const requestKey = "same-logical-key";
    const a = await create(first.id, { requestKey });
    const b = await create(first.id, { requestKey, workflowRevision: 1 }, admin);
    const c = await create(second.id, { requestKey });
    expect(new Set([a.body.action.id, b.body.action.id, c.body.action.id]).size).toBe(3);
    expect(b.body.action.performedById).toBe(adminId);
    expect([a.body.workflowRevision, b.body.workflowRevision, c.body.workflowRevision]).toEqual([1, 2, 1]);
    const firstState = await snapshot(first.id);
    const secondState = await snapshot(second.id);
    expect([firstState.actions.length, firstState.events.length, firstState.requests.length]).toEqual([2, 2, 2]);
    expect([secondState.actions.length, secondState.events.length, secondState.requests.length]).toEqual([1, 1, 1]);
  });

  it.each([
    { name: "edit", body: { description: "Stale description" } },
    { name: "assign", body: { assignedToId: null } },
    { name: "complete", body: { status: "COMPLETED", result: "Stale completion" } },
    { name: "cancel", body: { status: "CANCELLED", result: "Stale cancellation" } },
  ])("rejects stale $name without altering current state or audit evidence", async ({ name, body }) => {
    const f = await fixture();
    const before = await snapshot(f.ticketId);
    const changes = name === "assign" ? { assignedToId: adminId } : body;
    const response = await admin.patch(path(f.ticketId, f.action.id)).set(csrf).send({ workflowRevision: 0, ...changes });
    error(response, 409, "STALE_REVISION");
    expect(response.body).toEqual({ error: "Conflict", code: "STALE_REVISION", message: "Ticket changed; refresh before retrying." });
    expect(await snapshot(f.ticketId)).toEqual(before);
  });

  it("rejects a stale new creation and allows that unused key with the refreshed revision", async () => {
    const f = await fixture();
    const body = createBody();
    const before = await snapshot(f.ticketId);
    error(await staff.post(path(f.ticketId)).set(csrf).send(body), 409, "STALE_REVISION");
    expect(await snapshot(f.ticketId)).toEqual(before);
    const accepted = await staff.post(path(f.ticketId)).set(csrf).send({ ...body, workflowRevision: 1 }).expect(201);
    expect(accepted.body.workflowRevision).toBe(2);
    const after = await snapshot(f.ticketId);
    expect([after.actions.length, after.events.length, after.requests.length]).toEqual([2, 2, 2]);
  });
});
