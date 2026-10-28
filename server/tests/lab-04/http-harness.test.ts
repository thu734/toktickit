import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { once } from 'node:events';
import request from 'supertest';
import { startTestServer } from '../testHttpServer.js';

describe('isolated regression HTTP harness', () => {
  it.each([401, 404, 'disconnect'] as const)('owns the IPv4 endpoint despite an unrelated %s listener on the same port', async decoyBehavior => {
    const intended = await startTestServer((_req, res) => { res.statusCode = 400; res.end('intended application'); });
    const address = intended.address();
    expect(address).toMatchObject({ address: '127.0.0.1', family: 'IPv4' });
    if (!address || typeof address === 'string') throw new Error('Expected TCP endpoint');
    let decoyRequests = 0;
    const decoy = createServer((req, res) => {
      decoyRequests++;
      if (decoyBehavior === 'disconnect') { req.socket.destroy(); return; }
      res.statusCode = decoyBehavior; res.end('unrelated listener');
    });
    try {
      decoy.listen({ port: address.port, host: '::1', ipv6Only: true });
      await once(decoy, 'listening');
      const response = await request(intended).patch('/api/staff/tickets/123/status').send({ status: 'CLOSED' });
      expect(response.status).toBe(400);
      expect(response.text).toBe('intended application');
      expect(decoyRequests).toBe(0);
    } finally { await new Promise<void>((resolve, reject) => decoy.close(error => error ? reject(error) : resolve())); }
  });

  it('reuses the same owned endpoint across agents for one application', async () => {
    const listener = (_req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => { res.end('owned'); };
    const [a, b] = await Promise.all([startTestServer(listener), startTestServer(listener)]);
    expect(a).toBe(b);
    await request.agent(a).get('/').expect(200, 'owned');
    await request.agent(b).get('/').expect(200, 'owned');
    expect(a.listening).toBe(true);
  });

  it('keeps the listener alive when one agent request finishes before another constructed request starts', async () => {
    let entered!: () => void, release!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const resume = new Promise<void>(resolve => { release = resolve; });
    const server = await startTestServer(async (req, res) => {
      if (req.url === '/first') { entered(); await resume; }
      res.end(req.url);
    });
    const agent = request.agent(server);
    const first = agent.get('/first').then(response => response);
    try {
      await ready;
      const second = agent.get('/second');
      release();
      expect((await first).text).toBe('/first');
      expect(server.listening).toBe(true);
      expect((await second.expect(200)).text).toBe('/second');
    } finally { release(); await first; }
  });
});
