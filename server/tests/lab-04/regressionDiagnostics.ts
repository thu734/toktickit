import { execFileSync } from 'node:child_process';
import type { Server } from 'node:http';
import type { Request } from 'express';
import type { Test } from 'supertest';
import { expect } from 'vitest';
import { getPrisma } from '../../src/prisma.js';

// Opt-in, test-only evidence. Never records cookies, credentials or session IDs.
const enabled = process.env.ISSUE25_DIAGNOSTICS === '1';
const events: object[] = [];
let active = 0;
const observedServers = new WeakSet<Server>();
export function diagnosticEvent(event: string, detail: object = {}) {
  if (!enabled) return;
  events.push({ at: new Date().toISOString(), test: expect.getState().currentTestName, event, ...detail });
  if (events.length > 500) events.shift();
}
export function diagnosticLifecycle(event: string, detail: object = {}) {
  diagnosticEvent(event, detail);
  if (enabled) console.info('ISSUE25_LIFECYCLE', JSON.stringify({ event, active, ...detail }));
}
export function diagnosticFailure() {
  if (!enabled) return;
  let listeners: string;
  try { listeners = execFileSync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], { encoding: 'utf8' }); }
  catch (error) { listeners = String(error); }
  console.error('ISSUE25_TEST_FAILURE', JSON.stringify({ test: expect.getState().currentTestName, active, listeners, events }));
}
export function observeAgent(agent: unknown) {
  if (!enabled) return;
  const server = (agent as { app: Server }).app;
  (agent as { use: (plugin: (req: Test) => void) => void }).use(req => {
    req.on('request', () => diagnosticEvent('client-send', { method: req.method, url: req.url, server: server.address() }));
    req.on('error', (error: Error) => diagnosticEvent('client-error', { url: req.url, error: String(error), server: server.address() }));
    req.on('response', (response: { status: number; text: string }) => diagnosticEvent('client-response', {
      url: req.url, status: response.status, body: response.status === 404 ? response.text : undefined,
    }));
  });
  if (observedServers.has(server)) return;
  observedServers.add(server);
  server.on('listening', () => diagnosticEvent('http-listening', { address: server.address() }));
  server.on('close', () => diagnosticEvent('http-server-close', { active }));
  server.on('error', error => diagnosticEvent('http-server-error', { error: String(error) }));
  server.on('request', (req, res) => {
    active++;
    diagnosticEvent('http-request', { method: req.method, path: req.url });
    req.on('aborted', () => diagnosticEvent('http-aborted', { path: req.url }));
    req.on('error', error => diagnosticEvent('http-request-error', { error: String(error) }));
    res.on('error', error => diagnosticEvent('http-response-error', { error: String(error) }));
    res.on('finish', () => {
      const session = (req as Request).session;
      diagnosticEvent('http-finish', { method: req.method, path: req.url, status: res.statusCode,
        session: session ? { userId: session.userId, role: session.role } : null });
    });
    res.on('close', () => {
      active--;
      diagnosticEvent('http-response-close', { path: req.url, finished: res.writableFinished, active });
    });
  });
}
export function observeDatabase() {
  if (!enabled) return;
  getPrisma().$use(async (params, next) => {
    const mutation = /create|update|delete|executeRaw/i.test(params.action);
    if (mutation) diagnosticEvent('database-operation', { model: params.model, action: params.action,
      id: params.args?.where?.id });
    try { return await next(params); }
    catch (error) { diagnosticEvent('database-error', { model: params.model, action: params.action, error: String(error) }); throw error; }
  });
}
async function snapshot(actorId: number, ticketId?: number) {
  try {
    const prisma = getPrisma();
    return {
      target: await prisma.$queryRaw`SELECT current_database() AS db, current_schema() AS schema, pg_backend_pid() AS backend`,
      actor: await prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, isActive: true, mustChangePassword: true } }),
      ticket: ticketId === undefined ? undefined : await prisma.ticket.findUnique({ where: { id: ticketId } }),
      ownedFixtureCount: await prisma.ticket.count({ where: { requesterId: actorId } }),
    };
  } catch (error) { return { diagnosticError: String(error) }; }
}
export async function diagnosedRequest<T extends { status: number; body: unknown; text: string }>(
  context: { method: string; path: string; expectedStatus: number; actorId: number; ticketId?: number; fixture: object },
  send: () => PromiseLike<T>,
): Promise<T> {
  if (!enabled) return await send();
  const before = await snapshot(context.actorId, context.ticketId);
  try {
    const response = await send();
    if (response.status !== context.expectedStatus) await report({ status: response.status, body: response.body, text: response.text });
    return response;
  } catch (error) { await report({ error: String(error), stack: error instanceof Error ? error.stack : undefined }); throw error; }
  async function report(response: object) {
    console.error('ISSUE25_REQUEST_FAILURE', JSON.stringify({ test: expect.getState().currentTestName, ...context,
      before, after: await snapshot(context.actorId, context.ticketId), response, active, events }));
  }
}
