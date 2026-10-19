import type { Server } from 'node:http';
import { startTestServer } from '../testHttpServer.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { TicketStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { diagnosedRequest, observeAgent } from './regressionDiagnostics.js';
import { overlap } from './workflowConcurrency.js';

let server: Server;
const csrf = { 'X-Requested-With': 'XMLHttpRequest' };
const db = getPrisma;
type Agent = ReturnType<typeof request.agent>;
let staff: Agent, admin: Agent, requester: Agent;
let staffId: number, adminId: number, requesterId: number, categoryId: number, relatedSystemId: number;
const matrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN','IN_PROGRESS','CANCELLED'], OPEN: ['IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER','RESOLVED','CANCELLED'], WAITING_FOR_REQUESTER: ['IN_PROGRESS','RESOLVED','CANCELLED'],
  RESOLVED: ['CLOSED','REOPENED'], CLOSED: ['REOPENED'], REOPENED: ['IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CANCELLED'], CANCELLED: [],
};
async function account(role: UserRole, options: { locked?: boolean } = {}) {
  const user = await db().user.create({ data: { name: 'Workflow actor', email: `${randomUUID()}@test.local`, role,
    passwordHash: await bcrypt.hash('TestPassword123!', 4), mustChangePassword: !!options.locked } });
  const agent = request.agent(server);
  observeAgent(agent);
  await agent.post('/api/auth/login').set(csrf).send({ email: user.email, password: 'TestPassword123!' }).expect(200);
  return { user, agent };
}
beforeAll(async () => {
  const [target] = await db().$queryRaw<Array<{ db: string; schema: string }>>`SELECT current_database() AS db, current_schema() AS schema`;
  expect(target.db).toBe('toktickit_test'); expect(target.schema).toMatch(/^lab4_test_[a-f0-9]{32}$/);
  ({ categoryId, relatedSystemId } = await db().ticket.findFirstOrThrow());
  server = await startTestServer(app);
  const s = await account('IT_STAFF'), a = await account('ADMINISTRATOR'), r = await account('REQUESTER');
  staff = s.agent; staffId = s.user.id; admin = a.agent; adminId = a.user.id; requester = r.agent; requesterId = r.user.id;
});
const ticket = (currentStatus: TicketStatus = 'OPEN') => db().ticket.create({ data: {
  ticketNumber: `WF-${randomUUID()}`, summary: 'Workflow fixture', description: 'Isolated test', requesterId, categoryId, relatedSystemId, currentStatus,
} });
const mutate = (agent: Agent, id: number, operation: string, body: object) => agent.patch(`/api/staff/tickets/${id}/${operation}`).set(csrf).send(body);
const status = (agent: Agent, id: number, target: string, revision = 0) => mutate(agent, id, 'status', { status: target, workflowRevision: revision });
const create = (id: number, revision = 0) => staff.post(`/api/tickets/${id}/actions-taken`).set(csrf).send({ description: 'Investigate', requestKey: randomUUID(), workflowRevision: revision });
const actionPatch = (id: number, actionId: number, body: object) => admin.patch(`/api/tickets/${id}/actions-taken/${actionId}`).set(csrf).send(body);
const state = async (id: number) => ({ ticket: await db().ticket.findUniqueOrThrow({ where: { id } }),
  actions: await db().actionTaken.findMany({ where: { ticketId: id }, orderBy: { id: 'asc' } }),
  events: await db().actionAuditEvent.findMany({ where: { action: { ticketId: id } }, orderBy: { id: 'asc' } }),
  retries: await db().actionCreationRequest.findMany({ where: { ticketId: id }, orderBy: { id: 'asc' } }),
});

describe('WF-API-01 / WF-SEC-01', () => {
  for (const role of ['Staff', 'Admin']) for (const from of Object.values(TicketStatus)) for (const to of Object.values(TicketStatus)) {
    it(`${role}: ${from} -> ${to} (zero Actions)`, async () => {
      const t = await ticket(from), before = await state(t.id);
      const allowed = matrix[from].includes(to);
      const res = await diagnosedRequest({ method: 'PATCH', path: `/api/staff/tickets/${t.id}/status`,
        expectedStatus: allowed ? 200 : 400, actorId: role === 'Staff' ? staffId : adminId,
        ticketId: t.id, fixture: { from, to, before, categoryId, relatedSystemId, requesterId } },
        () => status(role === 'Staff' ? staff : admin, t.id, to));
      expect(res.status).toBe(allowed ? 200 : 400);
      if (allowed) {
        expect(res.body).toMatchObject({ currentStatus: to, workflowRevision: 1, assignedStaffId: null });
        expect((await state(t.id)).actions).toEqual([]);
      } else { expect(res.body.code).toBe('INVALID_STATUS_TRANSITION'); expect(await state(t.id)).toEqual(before); }
    });
  }
  it.each(['RESOLVED', 'CLOSED'])('rechecks %s gate for planned and completed follow-up work', async target => {
    for (const action of [ { status: 'PLANNED' as const, followUpRequired: false }, { status: 'COMPLETED' as const, followUpRequired: true } ]) {
      const t = await ticket(target === 'CLOSED' ? 'RESOLVED' : 'OPEN');
      await db().actionTaken.create({ data: { ticketId: t.id, performedById: staffId, description: 'Blocker', result: 'Result', followUpNote: 'Follow up', ...action } });
      const before = await state(t.id);
      const res = await status(admin, t.id, target).expect(409);
      expect(res.body).toMatchObject({ code: 'RESOLUTION_BLOCKED', blockingWork: { planned: action.status === 'PLANNED' ? 1 : 0, followUp: action.followUpRequired ? 1 : 0 } });
      expect(JSON.stringify(res.body)).not.toContain('password'); expect(await state(t.id)).toEqual(before);
    }
  });
  it('clears an audited completed follow-up blocker without reopening the Action; preserves ordering and identity', async () => {
    const t = await ticket(); const created = await create(t.id).expect(201); const id = created.body.action.id;
    await actionPatch(t.id, id, { workflowRevision: 1, status: 'COMPLETED', result: 'Fixed', followUpRequired: true, followUpNote: 'Check again' }).expect(200);
    await status(staff, t.id, 'RESOLVED', 2).expect(409);
    const corrected = await actionPatch(t.id, id, { workflowRevision: 2, followUpRequired: false }).expect(200);
    expect(corrected.body.action).toMatchObject({ status: 'COMPLETED', performedById: staffId, createdAt: created.body.action.createdAt });
    const s = await state(t.id); expect(s.events.at(-1)).toMatchObject({ actorId: adminId, eventType: 'CORRECTED', changedFields: { followUpRequired: false } });
    await status(admin, t.id, 'RESOLVED', 3).expect(200); await status(staff, t.id, 'CLOSED', 4).expect(200);
    expect((await state(t.id)).events).toEqual(s.events);
  });
  it('cancelled Actions with follow-up do not block and cancellation never auto-cancels work', async () => {
    const t = await ticket(); const c = await create(t.id).expect(201);
    await actionPatch(t.id, c.body.action.id, { workflowRevision: 1, status: 'CANCELLED', result: 'No longer needed', followUpRequired: true, followUpNote: 'Reference' }).expect(200);
    await status(admin, t.id, 'RESOLVED', 2).expect(200);
    const other = await ticket(); const planned = await create(other.id).expect(201);
    await status(staff, other.id, 'CANCELLED', 1).expect(200);
    expect((await state(other.id)).actions[0]).toMatchObject({ id: planned.body.action.id, status: 'PLANNED' });
  });
  it.each(['RESOLVED','CLOSED','CANCELLED'] as TicketStatus[])('rejects all Action writes on %s; resolved/closed reopen restores work', async terminal => {
    const t = await ticket(); const c = await create(t.id).expect(201);
    await db().ticket.update({ where: { id: t.id }, data: { currentStatus: terminal } });
    const before = await state(t.id);
    await create(t.id, 1).expect(409);
    await actionPatch(t.id, c.body.action.id, { workflowRevision: 1, result: 'Correction' }).expect(409);
    expect(await state(t.id)).toEqual(before);
    if (terminal !== 'CANCELLED') { await status(admin, t.id, 'REOPENED', 1).expect(200); await create(t.id, 2).expect(201); }
  });
  it.each(['assign','priority','status'])('%s requires valid/current revision and allows Admin', async op => {
    const t = await ticket(); const payload = op === 'assign' ? { assignedStaffId: adminId } : op === 'priority' ? { itPriority: 'URGENT' } : { status: 'IN_PROGRESS' };
    for (const revision of [undefined, null, -1, 0.5, '0', true]) {
      await mutate(admin, t.id, op, { ...payload, workflowRevision: revision }).expect(400);
    }
    const updated = await mutate(admin, t.id, op, { ...payload, workflowRevision: 0 }).expect(200);
    expect(updated.body.workflowRevision).toBe(1);
    const before = await state(t.id);
    const stale = await mutate(staff, t.id, op, { ...payload, workflowRevision: 0 }).expect(409);
    expect(stale.body.code).toBe('STALE_REVISION'); expect(await state(t.id)).toEqual(before);
  });
  it('validates owner targets, priorities, summary types and length without mutation', async () => {
    const t = await ticket(); const inactive = await account('IT_STAFF');
    await db().user.update({ where: { id: inactive.user.id }, data: { isActive: false } });
    const before = await state(t.id);
    for (const id of [undefined, requesterId, inactive.user.id, 2147483647, -1, '2junk']) {
      const res = await mutate(admin, t.id, 'assign', { workflowRevision: 0, assignedStaffId: id }).expect(400);
      expect(res.body.code).toBe('INVALID_ASSIGNMENT_TARGET');
    }
    await mutate(staff, t.id, 'priority', { workflowRevision: 0, itPriority: 'UNKNOWN' }).expect(400);
    for (const summary of ['x'.repeat(1001), {}, 5]) await mutate(staff, t.id, 'status', { workflowRevision: 0, status: 'RESOLVED', resolutionSummary: summary }).expect(400);
    expect(await state(t.id)).toEqual(before);
    const res = await mutate(staff, t.id, 'status', { workflowRevision: 0, status: 'RESOLVED', resolutionSummary: 'x'.repeat(1000) }).expect(200);
    expect(res.body.resolutionSummary).toHaveLength(1000);
  });
  it('permits independent ownership, unassignment and priority without changing requester priority', async () => {
    const t = await ticket();
    await mutate(admin, t.id, 'assign', { workflowRevision: 0, assignedStaffId: staffId }).expect(200);
    await mutate(staff, t.id, 'assign', { workflowRevision: 1, assignedStaffId: adminId }).expect(200);
    await mutate(admin, t.id, 'assign', { workflowRevision: 2, assignedStaffId: null }).expect(200);
    const res = await mutate(admin, t.id, 'priority', { workflowRevision: 3, itPriority: 'URGENT' }).expect(200);
    expect(res.body).toMatchObject({ workflowRevision: 4, assignedStaffId: null, requestedPriority: t.requestedPriority, itPriority: 'URGENT' });
  });
  it('enforces authentication, CSRF, role, missing-resource and current-account checks', async () => {
    const t = await ticket(); const before = await state(t.id);
    for (const op of ['assign','priority','status']) {
      const body = { workflowRevision: 0, status: 'RESOLVED', assignedStaffId: adminId, itPriority: 'HIGH' };
      await mutate(request.agent(server), t.id, op, body).set('X-Development-Requester-Id', String(adminId)).expect(401);
      await mutate(requester, t.id, op, body).expect(403);
      await mutate(admin, 2147483647, op, body).expect(404);
      await admin.patch(`/api/staff/tickets/${t.id}/${op}`).send(body).expect(400);
      const locked = await account('IT_STAFF', { locked: true });
      const lockRes = await mutate(locked.agent, t.id, op, body).expect(403); expect(lockRes.body.code).toBe('MUST_CHANGE_PASSWORD');
      for (const change of [{ isActive: false }, { role: 'REQUESTER' as const }]) {
        const actor = await account('ADMINISTRATOR'); await db().user.update({ where: { id: actor.user.id }, data: change });
        await mutate(actor.agent, t.id, op, body).expect('isActive' in change ? 401 : 403);
      }
    }
    expect(await state(t.id)).toEqual(before);
  });
  it('preserves advisory comments, privacy and non-workflow token exemption', async () => {
    const t = await ticket(), other = await account('REQUESTER');
    await staff.post(`/api/staff/tickets/${t.id}/notes`).set(csrf).send({ content: 'Private operational note' }).expect(201);
    await requester.get(`/api/staff/tickets/${t.id}/notes`).expect(403);
    const indication = await requester.post(`/api/tickets/${t.id}/indicate-resolved`).set(csrf).send({ comment: 'Looks fixed now' }).expect(200);
    expect(indication.body.comment.author.id).toBe(requesterId);
    await other.agent.post(`/api/tickets/${t.id}/indicate-resolved`).set(csrf).send({ comment: 'Looks fixed' }).expect(404);
    const comments = await requester.get(`/api/tickets/${t.id}/comments`).expect(200);
    expect(JSON.stringify(comments.body)).not.toContain('Private operational note');
    expect((await state(t.id)).ticket).toMatchObject({ currentStatus: 'OPEN', workflowRevision: 0 });
  });
});

describe('WF-RACE-01', () => {
  it('returns an Actions list and workflow revision from one consistent snapshot during writes', async () => {
    const t = await ticket();
    await Promise.all([
      (async () => { for (let revision = 0; revision < 12; revision++) await create(t.id, revision).expect(201); })(),
      (async () => { for (let read = 0; read < 12; read++) {
        const response = await staff.get(`/api/tickets/${t.id}/actions-taken`).expect(200);
        expect(response.body.actions).toHaveLength(response.body.workflowRevision);
      } })(),
    ]);
    const final = await state(t.id); expect(final.ticket.workflowRevision).toBe(12); expect(final.actions).toHaveLength(12);
  });
  it.each(['create','edit','transition'])('serializes resolve versus Action %s without gate escape', async operation => {
    const t = await ticket(); let actionId = 0, revision = 0;
    if (operation !== 'create') {
      const c = await create(t.id).expect(201); actionId = c.body.action.id;
      await actionPatch(t.id, actionId, { workflowRevision: 1, status: 'COMPLETED', result: 'Fixed' }).expect(200); revision = 2;
    }
    // transition case uses an unfinished Action; completion may win, but resolve with its old revision cannot.
    if (operation === 'transition') {
      await db().ticket.update({ where: { id: t.id }, data: { currentStatus: 'OPEN' } });
      const c = await create(t.id, revision).expect(201); actionId = c.body.action.id; revision++;
    }
    const responses = await overlap(t.id, () => [status(staff, t.id, 'RESOLVED', revision).then(r => r),
      (operation === 'create' ? create(t.id, revision) : actionPatch(t.id, actionId, { workflowRevision: revision,
        ...(operation === 'edit' ? { followUpRequired: true, followUpNote: 'New outstanding work' } : { status: 'COMPLETED', result: 'Finished' }) })).then(r => r)]);
    const s = await state(t.id);
    expect([200,409]).toContain(responses[0].status); expect([200,201,409]).toContain(responses[1].status);
    expect(responses.filter(r => r.status < 300)).toHaveLength(1);
    expect(s.ticket.workflowRevision).toBe(revision + 1);
    if (s.ticket.currentStatus === 'RESOLVED') expect(s.actions.some(a => a.status === 'PLANNED' || a.status === 'COMPLETED' && a.followUpRequired)).toBe(false);
    expect(s.events.length).toBe(s.actions.length + (operation === 'create' ? 0 : 1) + (responses[1].status < 300 && operation !== 'create' ? 1 : 0));
  });
  it('serializes owner versus priority on the single revision', async () => {
    const t = await ticket();
    const res = await overlap(t.id, () => [mutate(admin,t.id,'assign',{workflowRevision:0,assignedStaffId:adminId}).then(r=>r), mutate(staff,t.id,'priority',{workflowRevision:0,itPriority:'URGENT'}).then(r=>r)]);
    expect(res.map(r=>r.status).sort()).toEqual([200,409]);
    const s = await state(t.id); expect(s.ticket.workflowRevision).toBe(1);
    expect(s.ticket.assignedStaffId === adminId).toBe(res[0].status === 200);
    expect(s.ticket.itPriority === 'URGENT').toBe(res[1].status === 200);
  });
  it.each(['assign','priority','status'])('rolls back a database failure after the %s write', async operation => {
    const t = await ticket(), before = await state(t.id);
    await db().$executeRawUnsafe(`CREATE FUNCTION issue22_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated failure'; END; $$`);
    await db().$executeRawUnsafe(`CREATE TRIGGER issue22_reject AFTER UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION issue22_reject()`);
    const log = vi.spyOn(console,'error').mockImplementation(()=>{});
    try {
      const res = await mutate(admin,t.id,operation,{workflowRevision:0,status:'RESOLVED',itPriority:'HIGH',assignedStaffId:adminId}).expect(500);
      expect(JSON.stringify(res.body)).not.toMatch(/isolated failure|postgres|stack/i);
      expect(await state(t.id)).toEqual(before);
    } finally {
      log.mockRestore(); await db().$executeRawUnsafe(`DROP TRIGGER issue22_reject ON tickets`); await db().$executeRawUnsafe(`DROP FUNCTION issue22_reject()`);
    }
  });
});
