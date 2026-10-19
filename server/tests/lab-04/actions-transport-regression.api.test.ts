import { beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { startTestServer } from '../testHttpServer.js';
import { observeAgent } from './regressionDiagnostics.js';

let server: Server, cookie: string, ticketId: number, actorId: number;
let target: { db: string; schema: string };
beforeAll(async () => {
  const db = getPrisma();
  [target] = await db.$queryRaw<Array<{ db: string; schema: string }>>`SELECT current_database() AS db, current_schema() AS schema`;
  expect(target.db).toBe('toktickit_test'); expect(target.schema).toMatch(/^lab4_test_[a-f0-9]{32}$/);
  const user = await db.user.create({ data: { name: 'Transport Staff', email: `${randomUUID()}@test.local`, role: 'IT_STAFF',
    mustChangePassword: false, passwordHash: await bcrypt.hash('TestPassword123!', 4) } });
  actorId = user.id;
  const refs = await db.ticket.findFirstOrThrow({ select: { categoryId: true, relatedSystemId: true, requesterId: true } });
  ticketId = (await db.ticket.create({ data: { ...refs, ticketNumber: `TRANSPORT-${randomUUID()}`,
    summary: 'Transport reproduction fixture', description: 'Real authenticated Actions route', currentStatus: 'OPEN' } })).id;
  server = await startTestServer(app);
  const agent = request.agent(server); observeAgent(agent);
  const login = await agent.post('/api/auth/login').set('X-Requested-With', 'XMLHttpRequest')
    .send({ email: user.email, password: 'TestPassword123!' }).expect(200);
  cookie = login.headers['set-cookie'][0].split(';')[0];
});

describe('Actions transport distinguishes endpoint failures from authentication', () => {
  it.each(['401', 'socket'] as const)('reproduces a foreign %s outcome despite a valid Staff session; the owned endpoint stays authorized', async behavior => {
    let decoyRequests = 0, intendedRequests = 0;
    const decoy = createServer((req, res) => {
      decoyRequests++;
      if (behavior === 'socket') { req.socket.destroy(); return; }
      res.statusCode = 401; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Unrelated endpoint requires authentication' }));
    });
    const legacy = createServer(app);
    legacy.on('request', () => { intendedRequests++; });
    try {
      decoy.listen(0, '127.0.0.1'); await once(decoy, 'listening');
      const address = decoy.address(); if (!address || typeof address === 'string') throw new Error('Expected TCP port');
      // macOS permits independent IPv4/IPv6 listeners at the same port. Force
      // that condition explicitly so the regression is deterministic elsewhere.
      legacy.listen({ port: address.port, host: '::', ipv6Only: true }); await once(legacy, 'listening');
      const path = `/api/tickets/${ticketId}/actions-taken`;
      const wrongEndpoint = request(legacy).get(path).set('Cookie', cookie);
      if (behavior === '401') {
        const response = await wrongEndpoint.expect(401);
        expect(response.body).toEqual({ error: 'Unrelated endpoint requires authentication' });
      } else await expect(wrongEndpoint).rejects.toMatchObject({ code: 'ECONNRESET' });
      expect(intendedRequests).toBe(0); expect(decoyRequests).toBe(1);
      const actor = await getPrisma().user.findUniqueOrThrow({ where: { id: actorId }, select: { id: true, role: true, isActive: true, mustChangePassword: true } });
      expect(actor).toEqual({ id: actorId, role: 'IT_STAFF', isActive: true, mustChangePassword: false });
      expect((await request(server).get('/api/auth/me').set('Cookie', cookie).expect(200)).body.user.id).toBe(actorId);
      const real = await request(server).get(path).set('Cookie', cookie).expect(200);
      expect(real.body).toEqual({ actions: [], workflowRevision: 0 });
      if (process.env.ISSUE25_DIAGNOSTICS === '1') console.info('ACTIONS_TRANSPORT_CONTROL', JSON.stringify({
        target, actor, method: 'GET', path, expectedStatus: 200, foreignOutcome: behavior, intendedRequests, decoyRequests, ownedStatus: real.status,
      }));
    } finally {
      await Promise.all([legacy, decoy].map(s => new Promise<void>(resolve => s.close(() => resolve()))));
    }
  });
});
