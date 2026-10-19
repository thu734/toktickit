import { beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { startTestServer } from '../testHttpServer.js';

const csrf = { 'X-Requested-With': 'XMLHttpRequest' };
let server: Server, categoryId: number, relatedSystemId: number;
const prisma = getPrisma;
beforeAll(async () => {
  const [target] = await prisma().$queryRaw<Array<{ db: string; schema: string }>>`SELECT current_database() AS db, current_schema() AS schema`;
  expect(target.db).toBe('toktickit_test'); expect(target.schema).toMatch(/^lab4_test_[a-f0-9]{32}$/);
  ({ categoryId, relatedSystemId } = await prisma().ticket.findFirstOrThrow());
  server = await startTestServer((req, res) => {
    // Lose the HTTP response only AFTER the route has committed its transaction.
    if (req.headers['x-test-drop-response'] === '1') res.end = (() => { req.socket.destroy(); return res; }) as typeof res.end;
    app(req, res);
  });
});
async function login(email: string) {
  const agent = request.agent(server);
  await agent.post('/api/auth/login').set(csrf).send({ email, password: 'TestPassword123!' }).expect(200);
  return agent;
}
async function requester() {
  const user = await prisma().user.create({ data: { name: 'Retry fixture', email: `${randomUUID()}@test.local`,
    passwordHash: await bcrypt.hash('TestPassword123!', 4), role: 'REQUESTER', mustChangePassword: false } });
  return { user, agent: await login(user.email) };
}
const payload = () => ({ categoryId, relatedSystemId, summary: 'Recover one logical submission',
  description: 'Ticket retry regression fixture', requestedPriority: 'HIGH' as const });
const create = (agent: Awaited<ReturnType<typeof login>>, key?: string, body = payload()) => {
  const req = agent.post('/api/tickets').set(csrf).send(body);
  return key === undefined ? req : req.set('Idempotency-Key', key);
};

describe('Ticket creation retry boundary', () => {
  it('recovers the same committed Ticket after a lost response, fresh process and new session', async () => {
    const { user, agent } = await requester(), key = randomUUID();
    await expect(create(agent, key).set('X-Test-Drop-Response', '1')).rejects.toMatchObject({ code: 'ECONNRESET' });
    const committed = await prisma().ticket.findUniqueOrThrow({ where: { requesterId_creationRequestKey: { requesterId: user.id, creationRequestKey: key } } });
    const child = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
      import { resolveTestDatabaseUrl } from './tests/testDatabase.ts';
      import { createTicketOnce } from './src/services/ticketCreation.ts';
      import { getPrisma } from './src/prisma.ts';
      resolveTestDatabaseUrl(process.env.DATABASE_URL);
      const { requesterId, payload, key } = JSON.parse(process.argv[1]);
      try { console.log(JSON.stringify(await createTicketOnce(requesterId, payload, key))); }
      finally { await getPrisma().$disconnect(); }
    `, JSON.stringify({ requesterId: user.id, payload: payload(), key })], { env: process.env, encoding: 'utf8' });
    expect(JSON.parse(child).id).toBe(committed.id);
    const recovered = await create(await login(user.email), key).expect(201);
    expect(recovered.body).toMatchObject({ id: committed.id, ticketNumber: committed.ticketNumber, currentStatus: 'NEW', requestedPriority: 'HIGH', itPriority: 'HIGH' });
    expect(recovered.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(recovered.body).not.toHaveProperty('creationRequestKey'); expect(recovered.body).not.toHaveProperty('creationPayloadHash');
    expect(await prisma().ticket.count({ where: { requesterId: user.id } })).toBe(1);
    expect(committed.creationPayloadHash).toMatch(/^[a-f0-9]{64}$/);
  });
  it('creates exactly one Ticket for simultaneous repeats, returning the same result to each', async () => {
    const { user, agent } = await requester(), key = randomUUID();
    const responses = await Promise.all([create(agent, key), create(agent, key)]);
    expect(responses.map(r => r.status)).toEqual([201, 201]);
    expect(responses[0].body).toEqual(responses[1].body);
    expect(await prisma().ticket.count({ where: { requesterId: user.id } })).toBe(1);
  });
  it('rejects changed details for an already-committed operation without another insert or overwrite', async () => {
    const { user, agent } = await requester(), key = randomUUID();
    const initial = await create(agent, key).expect(201);
    const before = await prisma().ticket.findUniqueOrThrow({ where: { id: initial.body.id } });
    const changed = await create(agent, key, { ...payload(), summary: 'Different submission details' }).expect(409);
    expect(changed.body.code).toBe('CREATION_REQUEST_CONFLICT');
    expect(await prisma().ticket.findUniqueOrThrow({ where: { id: initial.body.id } })).toEqual(before);
    expect(await prisma().ticket.count({ where: { requesterId: user.id } })).toBe(1);
  });
  it('keeps keys scoped to the authenticated Requester, including concurrent different owners', async () => {
    const a = await requester(), b = await requester(), key = randomUUID();
    const responses = await Promise.all([create(a.agent, key), create(b.agent, key)]);
    expect(responses.map(r => r.status)).toEqual([201, 201]);
    expect(responses[0].body.id).not.toBe(responses[1].body.id);
    expect(responses[0].body.ticketNumber).not.toBe(responses[1].body.ticketNumber);
    expect(responses.map(r => r.body.requesterId)).toEqual([a.user.id, b.user.id]);
  });
  it('preserves intentional identical submissions with different keys and legacy unkeyed creation', async () => {
    const { user, agent } = await requester();
    const responses = await Promise.all([create(agent, randomUUID()), create(agent, randomUUID()), create(agent), create(agent)]);
    expect(responses.map(r => r.status)).toEqual([201, 201, 201, 201]);
    expect(new Set(responses.map(r => r.body.id)).size).toBe(4);
    expect(await prisma().ticket.count({ where: { requesterId: user.id } })).toBe(4);
  });
  it('does not consume a key on validation failure and normalizes whitespace and UUID case on replay', async () => {
    const { user, agent } = await requester(), key = randomUUID();
    await create(agent, key, { ...payload(), summary: 'bad' }).expect(400);
    const initial = await create(agent, key.toUpperCase(), { ...payload(), summary: `  ${payload().summary}  ` }).expect(201);
    expect((await create(agent, key).expect(201)).body.id).toBe(initial.body.id);
    expect(await prisma().ticket.count({ where: { requesterId: user.id } })).toBe(1);
  });
  it('recovers a committed creation even if its reference data becomes inactive', async () => {
    const { agent } = await requester(), key = randomUUID();
    const category = await prisma().category.create({ data: { name: `Retry ${randomUUID()}` } });
    const body = { ...payload(), categoryId: category.id };
    const initial = await create(agent, key, body).expect(201);
    await prisma().category.update({ where: { id: category.id }, data: { isActive: false } });
    expect((await create(agent, key, body).expect(201)).body.id).toBe(initial.body.id);
    const invalid = await create(agent, randomUUID(), body).expect(400);
    expect(invalid.body.details.categoryId).toBe('Selected Category does not exist or is inactive.');
  });
  it.each(['', 'not-a-uuid', 'a'.repeat(129)])('rejects malformed operation key %j without creating a Ticket', async key => {
    const { user, agent } = await requester();
    expect((await create(agent, key).expect(400)).body.code).toBe('INVALID_CREATION_REQUEST_KEY');
    expect(await prisma().ticket.count({ where: { requesterId: user.id } })).toBe(0);
  });
  it('enforces requester/key uniqueness in the database while allowing null legacy keys', async () => {
    const { user, agent } = await requester(), key = randomUUID();
    await create(agent, key).expect(201);
    await expect(prisma().ticket.create({ data: { ...payload(), requesterId: user.id, ticketNumber: `DUP-${randomUUID()}`, creationRequestKey: key } })).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma().ticket.count({ where: { requesterId: user.id } })).toBe(1);
  });
});
