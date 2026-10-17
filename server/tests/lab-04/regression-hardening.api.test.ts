import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { loginAsUser } from '../helpers/login.js';

const csrf = { 'X-Requested-With': 'XMLHttpRequest' };
let owner: Awaited<ReturnType<typeof loginAsUser>>, foreign: typeof owner;
let staff: typeof owner, admin: typeof owner;
let ticketId: number, attachmentId: number, ownerId: number;
beforeAll(async () => {
  const db = getPrisma();
  const [target] = await db.$queryRaw<Array<{ db: string; schema: string }>>`SELECT current_database() AS db, current_schema() AS schema`;
  expect(target.db).toBe('toktickit_test'); expect(target.schema).toMatch(/^lab4_test_[a-f0-9]{32}$/);
  const users = await db.user.findMany({ where: { role: 'REQUESTER', isActive: true }, orderBy: { id: 'asc' } });
  ownerId = users[0].id; owner = await loginAsUser(ownerId); foreign = await loginAsUser(users[1].id);
  staff = await loginAsUser((await db.user.findFirstOrThrow({ where: { role: 'IT_STAFF', isActive: true } })).id);
  admin = await loginAsUser((await db.user.findFirstOrThrow({ where: { role: 'ADMINISTRATOR', isActive: true } })).id);
  const ticket = await db.ticket.findFirstOrThrow({ where: { requesterId: ownerId } }); ticketId = ticket.id;
  attachmentId = (await db.attachment.create({ data: { ticketId, filename: 'private.pdf', storedFilename: 'private.pdf',
    filePath: '/nonexistent-hardening-fixture', fileSize: 10, mimeType: 'application/pdf' } })).id;
});
afterEach(() => vi.restoreAllMocks());

describe('Issue 25 protected resource boundaries', () => {
  it.each(['detail', 'history', 'upload', 'remove', 'download', 'comments', 'post-comment', 'indicate', 'actions'])('%s conceals missing versus foreign resources', async operation => {
    const send = (missing: boolean) => {
      const t = missing ? 2147483647 : ticketId, a = missing ? 2147483647 : attachmentId;
      switch (operation) {
        case 'detail': return foreign.get(`/api/tickets/${t}`);
        case 'history': return foreign.get(`/api/tickets/${t}/attachments`);
        case 'upload': return foreign.post(`/api/tickets/${t}/attachments`).set(csrf).attach('file', Buffer.from('%PDF test'), 'test.pdf');
        case 'remove': return foreign.post(`/api/attachments/${a}/soft-remove`).set(csrf).send({ removalReason: 'Remove test file' });
        case 'download': return foreign.get(`/api/attachments/${a}/download`);
        case 'comments': return foreign.get(`/api/tickets/${t}/comments`);
        case 'post-comment': return foreign.post(`/api/tickets/${t}/comments`).set(csrf).send({ content: 'Test comment' });
        case 'indicate': return foreign.post(`/api/tickets/${t}/indicate-resolved`).set(csrf).send({ comment: 'Appears resolved' });
        default: return foreign.get(`/api/tickets/${t}/actions-taken`);
      }
    };
    const before = await getPrisma().attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    const existing = await send(false), missing = await send(true);
    expect(existing.status).toBe(404); expect(missing.status).toBe(404); expect(existing.body).toEqual(missing.body);
    expect(await getPrisma().attachment.findUniqueOrThrow({ where: { id: attachmentId } })).toEqual(before);
  });
  it.each(['staff', 'admin'] as const)('%s can read history but cannot upload or remove', async role => {
    const agent = role === 'staff' ? staff : admin;
    const res = await agent.get(`/api/tickets/${ticketId}/attachments`).expect(200);
    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: attachmentId, filename: 'private.pdf' })]));
    expect(JSON.stringify(res.body)).not.toMatch(/filePath|storedFilename|passwordHash/);
    await agent.post(`/api/tickets/${ticketId}/attachments`).set(csrf).attach('file', Buffer.from('%PDF test'), 'test.pdf').expect(403);
    await agent.post(`/api/attachments/${attachmentId}/soft-remove`).set(csrf).send({ removalReason: 'Remove test file' }).expect(403);
  });
  it('conceals removed foreign attachments before revealing Gone status', async () => {
    await getPrisma().attachment.update({ where: { id: attachmentId }, data: { isRemoved: true } });
    try {
      expect((await foreign.get(`/api/attachments/${attachmentId}/download`).expect(404)).body)
        .toEqual((await foreign.get('/api/attachments/2147483647/download').expect(404)).body);
      await owner.get(`/api/attachments/${attachmentId}/download`).expect(410);
    } finally { await getPrisma().attachment.update({ where: { id: attachmentId }, data: { isRemoved: false } }); }
  });
  it.each(['read', 'write'])('denies protected %s when lock lookup fails, without mutation', async operation => {
    const db = getPrisma();
    await db.user.update({ where: { id: ownerId }, data: { mustChangePassword: true } });
    const before = await db.ticket.count();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const original = db.user.findUnique.bind(db.user);
    let fail = true;
    db.user.findUnique = ((...args: Parameters<typeof original>) => {
      if (fail) { fail = false; return Promise.reject(new Error('sensitive database failure')); }
      return original(...args);
    }) as unknown as typeof db.user.findUnique;
    try {
      const res = operation === 'read' ? await owner.get('/api/tickets') : await owner.post('/api/tickets').set(csrf).send({});
      expect(res.status).toBe(500); expect(res.body.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(res.body)).not.toMatch(/sensitive|stack|database/);
      expect(await db.ticket.count()).toBe(before);
      db.user.findUnique = original;
      await owner.get('/api/tickets').expect(403);
      await owner.get('/api/auth/me').expect(200);
    } finally { db.user.findUnique = original; await db.user.update({ where: { id: ownerId }, data: { mustChangePassword: false } }); }
  });
});
