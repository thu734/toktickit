import { beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { startTestServer } from '../testHttpServer.js';
import { observeAgent } from './regressionDiagnostics.js';

const csrf = { 'X-Requested-With': 'XMLHttpRequest' };
type Agent = ReturnType<typeof request.agent>;
let staff: Agent, admin: Agent, owner: Agent;
let staffId: number, ticketId: number, categoryId: number, attachmentId: number;
const summary = `Queue schema regression ${randomUUID()}`;
beforeAll(async () => {
  const db = getPrisma();
  const [target] = await db.$queryRaw<Array<{ db: string; schema: string }>>`SELECT current_database() AS db, current_schema() AS schema`;
  expect(target.db).toBe('toktickit_test'); expect(target.schema).toMatch(/^lab4_test_[a-f0-9]{32}$/);
  const server = await startTestServer(app);
  const actors = [];
  for (const role of ['IT_STAFF', 'ADMINISTRATOR', 'REQUESTER'] as const) {
    const user = await db.user.create({ data: { name: 'Schema regression actor', email: `${randomUUID()}@test.local`, role,
      mustChangePassword: false, passwordHash: await bcrypt.hash('TestPassword123!', 4) } });
    const agent = request.agent(server); observeAgent(agent);
    await agent.post('/api/auth/login').set(csrf).send({ email: user.email, password: 'TestPassword123!' }).expect(200);
    actors.push({ user, agent });
  }
  staff = actors[0].agent; staffId = actors[0].user.id; admin = actors[1].agent; owner = actors[2].agent;
  const refs = await db.ticket.findFirstOrThrow({ select: { categoryId: true, relatedSystemId: true } });
  categoryId = refs.categoryId;
  const ticket = await db.ticket.create({ data: { ...refs, requesterId: actors[2].user.id, assignedStaffId: staffId,
    ticketNumber: `SCHEMA-${randomUUID()}`, summary, description: 'Preserve inherited Ticket operations', itPriority: 'HIGH', currentStatus: 'OPEN' } });
  ticketId = ticket.id;
  attachmentId = (await db.attachment.create({ data: { ticketId, filename: 'removed-evidence.pdf', storedFilename: 'removed-evidence.pdf',
    mimeType: 'application/pdf', fileSize: 4, filePath: 'not-read-removed-fixture.pdf', isRemoved: true,
    removedAt: new Date(), removalReason: 'Preserved removed evidence' } })).id;
  // Reproduce the verified development schema mismatch ONLY in this fresh,
  // asserted disposable schema. Existing development columns/data are untouched.
  await db.$executeRawUnsafe('ALTER TABLE tickets DROP COLUMN "creationRequestKey", DROP COLUMN "creationPayloadHash"');
});

describe('inherited Ticket operations do not select private retry metadata', () => {
  it.each(['Staff', 'Admin'])('%s loads the filtered queue with the original Ticket schema and response shape', async role => {
    const response = await (role === 'Staff' ? staff : admin).get('/api/staff/tickets').query({
      search: summary, categoryId, itPriority: 'HIGH', currentStatus: 'OPEN', assignedStaffId: staffId,
      sortBy: 'updatedAt', sortOrder: 'desc', page: 1, limit: 10,
    }).expect(200);
    expect(response.body.pagination).toEqual({ page: 1, limit: 10, totalItems: 1, totalPages: 1 });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ id: ticketId, summary, currentStatus: 'OPEN', workflowRevision: 0, assignedStaffId: staffId });
    expect(response.body.data[0]).not.toHaveProperty('creationRequestKey');
    expect(response.body.data[0]).not.toHaveProperty('creationPayloadHash');
  });
  it('preserves Staff detail, Internal Notes and Actions access on that same schema', async () => {
    expect((await staff.get(`/api/staff/tickets/${ticketId}`).expect(200)).body.id).toBe(ticketId);
    expect((await staff.get(`/api/staff/tickets/${ticketId}/notes`).expect(200)).body).toEqual([]);
    expect((await staff.get(`/api/tickets/${ticketId}/actions-taken`).expect(200)).body).toEqual({ actions: [], workflowRevision: 0 });
  });
  it('preserves owned Requester reads and protected role boundaries', async () => {
    expect((await owner.get('/api/tickets').expect(200)).body.items.map((t: { id: number }) => t.id)).toEqual([ticketId]);
    expect((await owner.get(`/api/tickets/${ticketId}`).expect(200)).body.id).toBe(ticketId);
    expect((await owner.get(`/api/tickets/${ticketId}/comments`).expect(200)).body).toEqual([]);
    expect((await owner.get(`/api/tickets/${ticketId}/attachments`).expect(200)).body).toEqual(expect.arrayContaining([expect.objectContaining({ id: attachmentId, isRemoved: true })]));
    await owner.get(`/api/attachments/${attachmentId}/download`).expect(410);
    await owner.post(`/api/attachments/${attachmentId}/soft-remove`).set(csrf).send({ removalReason: 'Already removed fixture' }).expect(200);
    await owner.get('/api/staff/tickets').expect(403);
    await request(await startTestServer(app)).get('/api/staff/tickets').expect(401);
  });
  it('preserves Staff workflow writes and their revision after the query correction', async () => {
    const response = await staff.patch(`/api/staff/tickets/${ticketId}/priority`).set(csrf).send({ itPriority: 'URGENT', workflowRevision: 0 }).expect(200);
    expect(response.body).toMatchObject({ id: ticketId, itPriority: 'URGENT', workflowRevision: 1 });
    expect(response.body).not.toHaveProperty('creationRequestKey');
  });
});
