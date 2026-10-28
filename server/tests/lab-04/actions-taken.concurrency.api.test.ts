import { startTestServer } from "../testHttpServer.js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const csrf = { "X-Requested-With": "XMLHttpRequest" };
let staff: ReturnType<typeof request.agent>;
let admin: ReturnType<typeof request.agent>;
let staffId: number;
let adminId: number;
let requesterId: number;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  const prisma = getPrisma();
  const [target] = await prisma.$queryRaw<Array<{ db: string; schema: string }>>`SELECT current_database() AS db, current_schema() AS schema`;
  expect(target.db).toBe("toktickit_test");
  expect(target.schema).toMatch(/^lab4_test_[a-f0-9]{32}$/);
  const template = await prisma.ticket.findFirstOrThrow();
  ({ requesterId, categoryId, relatedSystemId } = template);
  const agents = [];
  for (const email of ["alex.t@toktickit.local", "admin@toktickit.local"]) {
    const agent = request.agent(await startTestServer(app));
    const login = await agent.post("/api/auth/login").set(csrf).send({ email, password: "Initial123!" }).expect(200);
    await agent.post("/api/auth/change-password").set(csrf).send({ currentPassword: "Initial123!", newPassword: "TestPassword123!", confirmPassword: "TestPassword123!" }).expect(200);
    agents.push({ agent, id: login.body.user.id as number });
  }
  staff = agents[0].agent; staffId = agents[0].id;
  admin = agents[1].agent; adminId = agents[1].id;
});

const ticket = () => getPrisma().ticket.create({ data: { ticketNumber: `RACE-${randomUUID()}`, summary: "Action race", description: "Disposable Action concurrency fixture", requesterId, categoryId, relatedSystemId, currentStatus: "OPEN" } });
const post = (agent: typeof staff, id: number, body: object) => agent.post(`/api/tickets/${id}/actions-taken`).set(csrf).send(body);
const patch = (agent: typeof staff, id: number, actionId: number, body: object) => agent.patch(`/api/tickets/${id}/actions-taken/${actionId}`).set(csrf).send(body);
const snapshot = async (ticketId: number) => ({
  ticket: await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticketId } }),
  actions: await getPrisma().actionTaken.findMany({ where: { ticketId }, orderBy: { id: "asc" } }),
  events: await getPrisma().actionAuditEvent.findMany({ where: { action: { ticketId } }, orderBy: { id: "asc" } }),
  retries: await getPrisma().actionCreationRequest.findMany({ where: { ticketId }, orderBy: { id: "asc" } }),
});

// Hold the actual parent row until both HTTP transactions are waiting on its
// blocking chain. This exercises overlap deterministically, without fixed sleeps
// or a mock transaction that could hide database races.
async function overlap(ticketId: number, run: () => Promise<request.Response>[]) {
  const prisma = getPrisma();
  let release!: () => void;
  let acquired!: (pid: number) => void;
  const unlocked = new Promise<void>(resolve => { release = resolve; });
  const locked = new Promise<number>(resolve => { acquired = resolve; });
  const holding = prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${ticketId} FOR UPDATE`;
    const [row] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
    acquired(row.pid);
    await unlocked;
  }, { timeout: 10000 });
  const pid = await Promise.race([locked, holding.then(() => { throw new Error("Lock was not acquired"); })]);
  const requests = run();
  let waiting = 0;
  try {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const [row] = await prisma.$queryRaw<Array<{ count: number }>>`
        WITH RECURSIVE waiters AS (
          SELECT pid FROM pg_stat_activity WHERE ${pid} = ANY(pg_blocking_pids(pid))
          UNION
          SELECT a.pid FROM pg_stat_activity a JOIN waiters w ON w.pid = ANY(pg_blocking_pids(a.pid))
        ) SELECT count(*)::int AS count FROM waiters`;
      waiting = row.count;
      if (waiting >= 2) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  } finally { release(); await holding; }
  const responses = await Promise.all(requests);
  expect(waiting).toBeGreaterThanOrEqual(2);
  return responses;
}

describe("Issue 20 transactional Action concurrency and rollback", () => {
  it("returns the identical original response to overlapping duplicate creates", async () => {
    const t = await ticket();
    const body = { workflowRevision: 0, requestKey: "same", description: "Inspect", result: "Initial finding" };
    const responses = await overlap(t.id, () => [post(staff, t.id, body).then(r => r), post(staff, t.id, body).then(r => r)]);
    expect(responses.map(r => r.status)).toEqual([201, 201]);
    expect(responses[1].body).toEqual(responses[0].body);
    const state = await snapshot(t.id);
    expect(state.ticket.workflowRevision).toBe(1);
    expect(state.actions).toHaveLength(1); expect(state.events).toHaveLength(1); expect(state.retries).toHaveLength(1);
    expect(state.events[0]).toMatchObject({ actionId: state.actions[0].id, actorId: staffId, eventType: "CREATED" });
    expect(state.retries[0].originalResult).toEqual(responses[0].body);
  });

  it("returns retry conflict, not stale revision, for overlapping changed-payload keys", async () => {
    const t = await ticket();
    const body = { workflowRevision: 0, requestKey: "same", description: "Inspect" };
    const responses = await overlap(t.id, () => [post(staff, t.id, { ...body, result: "A" }).then(r => r), post(staff, t.id, { ...body, result: "B" }).then(r => r)]);
    expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
    expect(responses.find(r => r.status === 409)!.body).toEqual({ error: "Conflict", code: "REQUEST_KEY_REUSED", message: "request key already used with a different payload" });
    const winner = responses.find(r => r.status === 201)!;
    const state = await snapshot(t.id);
    expect(state.actions).toHaveLength(1); expect(state.events).toHaveLength(1); expect(state.retries).toHaveLength(1);
    expect(state.actions[0].result).toBe(winner.body.action.result);
    expect(state.ticket.workflowRevision).toBe(1);
  });

  it.each([false, true])("keeps exactly the winning update and actor (assignment race: %s)", async assign => {
    const t = await ticket();
    const created = await post(staff, t.id, { workflowRevision: 0, requestKey: "create", description: "Inspect" }).expect(201);
    const changes = [{ result: "Staff finding" }, assign ? { assignedToId: adminId } : { result: "Admin finding" }];
    const responses = await overlap(t.id, () => [patch(staff, t.id, created.body.action.id, { workflowRevision: 1, ...changes[0] }).then(r => r), patch(admin, t.id, created.body.action.id, { workflowRevision: 1, ...changes[1] }).then(r => r)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    const winnerIndex = responses.findIndex(r => r.status === 200);
    expect(responses[1 - winnerIndex].body).toEqual({ error: "Conflict", code: "STALE_REVISION", message: "Ticket changed; refresh before retrying." });
    const state = await snapshot(t.id);
    expect(state.ticket.workflowRevision).toBe(2);
    expect(state.actions[0].result).toBe(responses[winnerIndex].body.action.result);
    expect(state.actions[0].assignedToId).toBe(responses[winnerIndex].body.action.assignedToId);
    expect(state.events).toHaveLength(2);
    expect(state.events[1]).toMatchObject({ actionId: created.body.action.id, actorId: winnerIndex === 0 ? staffId : adminId,
      eventType: assign && winnerIndex === 1 ? "ASSIGNED" : "UPDATED", changedFields: changes[winnerIndex] });
    expect(state.retries).toHaveLength(1);
  });

  it.each(["create", "patch"] as const)("rolls back %s after real database failure following writes", async operation => {
    const prisma = getPrisma();
    const t = await ticket();
    const created = operation === "patch" ? await post(staff, t.id, { workflowRevision: 0, requestKey: "create", description: "Inspect" }).expect(201) : null;
    const before = await snapshot(t.id);
    // Test-only fault injection: POST fails after Action+audit writes; PATCH
    // fails after the Action update. The existing setup guards this schema.
    const table = operation === "create" ? "action_creation_requests" : "action_audit_events";
    await prisma.$executeRawUnsafe(`CREATE FUNCTION issue20_test_reject_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Intentional isolated audit failure'; END; $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER issue20_test_reject BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION issue20_test_reject_insert()`);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = operation === "create"
        ? await post(staff, t.id, { workflowRevision: 0, requestKey: "failing-create", description: "Must roll back" })
        : await patch(admin, t.id, created!.body.action.id, { workflowRevision: 1, result: "Must roll back" });
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal Server Error", code: "INTERNAL_ERROR" });
      expect(log).toHaveBeenCalled();
      expect(await snapshot(t.id)).toEqual(before);
    } finally {
      log.mockRestore();
      await prisma.$executeRawUnsafe(`DROP TRIGGER issue20_test_reject ON "${table}"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION issue20_test_reject_insert()`);
    }
  });
});
