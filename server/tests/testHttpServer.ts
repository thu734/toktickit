import { createServer, type RequestListener, type Server } from 'node:http';
import { diagnosticLifecycle } from './lab-04/regressionDiagnostics.js';

const servers = new Set<Server>();
let listeners = new WeakMap<RequestListener, Promise<Server>>();

/** Supertest sends to IPv4. Own that endpoint and keep it alive across concurrent requests. */
export function startTestServer(listener: RequestListener): Promise<Server> {
  const existing = listeners.get(listener);
  if (existing) return existing;
  const ready = (async () => {
    const server = createServer(listener);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
    });
    servers.add(server);
    return server;
  })();
  listeners.set(listener, ready);
  return ready;
}

/** Called before Prisma disconnect/schema disposal, after all suite requests settle. */
export async function closeTestServers() {
  diagnosticLifecycle('http-teardown-start', { servers: servers.size });
  await Promise.all([...servers].map(server => new Promise<void>((resolve, reject) => {
    server.close(error => {
      servers.delete(server);
      if (error) reject(error); else resolve();
    });
  })));
  listeners = new WeakMap();
  diagnosticLifecycle('http-teardown-complete');
}
