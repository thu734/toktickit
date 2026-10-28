import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { setImmediate } from 'node:timers/promises';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { startTestServer } from '../testHttpServer.js';

const csrf = { 'X-Requested-With': 'XMLHttpRequest' };
let server: Server;
const prisma = getPrisma;
beforeAll(async () => {
  const [target] = await prisma().$queryRaw<Array<{ db: string; schema: string }>>`SELECT current_database() AS db, current_schema() AS schema`;
  expect(target.db).toBe('toktickit_test');
  expect(target.schema).toMatch(/^lab4_test_[a-f0-9]{32}$/);
  server = await startTestServer(app);
});
beforeEach(async () => {
  // Only this suite's guarded schema; no deletion or development fixtures.
  await prisma().user.updateMany({ where: { role: 'ADMINISTRATOR' }, data: { isActive: false } });
});
async function administrator() {
  const user = await prisma().user.create({ data: { name: 'Safety fixture', email: `${randomUUID()}@test.local`,
    role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false,
    passwordHash: await bcrypt.hash('TestPassword123!', 4) } });
  const agent = request.agent(server);
  await agent.post('/api/auth/login').set(csrf).send({ email: user.email, password: 'TestPassword123!' }).expect(200);
  return { user, agent };
}

async function queuedMutations(run: () => Promise<request.Response>[]) {
  let acquired!: (pid: number) => void, release!: () => void;
  const ready = new Promise<number>(resolve => { acquired = resolve; });
  const resume = new Promise<void>(resolve => { release = resolve; });
  const holding = prisma().$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(334, 25)::text`;
    const [row] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
    acquired(row.pid);
    await resume;
  });
  const pid = await Promise.race([ready, holding.then(() => { throw new Error('Safety barrier was not acquired'); })]);
  let completed = 0, waiting = 0;
  const requests = run().map(p => p.finally(() => { completed++; }));
  try {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && completed < requests.length) {
      const [row] = await prisma().$queryRaw<Array<{ count: number }>>`
        WITH RECURSIVE waiters AS (
          SELECT pid FROM pg_stat_activity WHERE ${pid} = ANY(pg_blocking_pids(pid))
          UNION SELECT a.pid FROM pg_stat_activity a JOIN waiters w ON w.pid = ANY(pg_blocking_pids(a.pid))
        ) SELECT count(*)::int AS count FROM waiters`;
      waiting = row.count;
      if (waiting === requests.length) break;
      await setImmediate(); // Yield to active requests; no delay/retry of mutations.
    }
  } finally { release(); await holding; }
  const responses = await Promise.all(requests);
  expect(waiting, 'Both mutations must wait at the database safety boundary').toBe(requests.length);
  return responses;
}

describe('inherited BR-09 / BR-10 under concurrent account updates', () => {
  it.each(['REQUESTER', 'IT_STAFF'])('permits only one of two concurrent self-demotions to %s', async role => {
    const a = await administrator(), b = await administrator();
    const before = [a.user, b.user];
    const responses = await queuedMutations(() => [a, b].map(({ user, agent }) =>
      agent.patch(`/api/admin/users/${user.id}`).set(csrf).send({ role, name: 'Changed only on success' }).then(r => r)));
    expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
    const rejectedIndex = responses.findIndex(r => r.status === 400);
    expect(responses[rejectedIndex].body).toEqual({ error: 'Bad Request', message: 'Cannot deactivate the only active Administrator account.' });
    expect(await prisma().user.findUnique({ where: { id: before[rejectedIndex].id } })).toEqual(before[rejectedIndex]);
    expect(await prisma().user.count({ where: { role: 'ADMINISTRATOR', isActive: true } })).toBe(1);
    const winner = responses.find(r => r.status === 200)!;
    expect(winner.body).toMatchObject({ role, isActive: true, name: 'Changed only on success' });
    expect(winner.body).not.toHaveProperty('passwordHash');
  });

  it('rejects self-deactivation and removal of the last active Administrator without partial changes', async () => {
    const { user, agent } = await administrator();
    await agent.patch(`/api/admin/users/${user.id}`).set(csrf).send({ isActive: false }).expect(400);
    await agent.patch(`/api/admin/users/${user.id}`).set(csrf).send({ role: 'REQUESTER', name: 'Must not be saved' }).expect(400);
    expect(await prisma().user.findUnique({ where: { id: user.id } })).toEqual(user);
  });

  it('allows deactivation of another Administrator while preserving the last one', async () => {
    const a = await administrator(), b = await administrator();
    await a.agent.patch(`/api/admin/users/${b.user.id}`).set(csrf).send({ isActive: false }).expect(200);
    await a.agent.patch(`/api/admin/users/${a.user.id}`).set(csrf).send({ role: 'IT_STAFF' }).expect(400);
    expect(await prisma().user.count({ where: { role: 'ADMINISTRATOR', isActive: true } })).toBe(1);
    await b.agent.get('/api/admin/users').expect(401);
  });
});
