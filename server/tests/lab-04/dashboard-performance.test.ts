import { performance } from 'node:perf_hooks';
import { Prisma, PrismaClient, TicketStatus, ITPriority } from '@prisma/client';
import { expect, it, vi } from 'vitest';
import * as prismaModule from '../../src/prisma.js';
import { getStaffDashboard } from '../../src/services/staffDashboard.js';
import { account, action, assertIsolated, ticket } from './staffDashboardFixtures.js';

it('DASH-PERF-01 keeps query count and previews bounded as isolated operational data grows', async () => {
  await assertIsolated();
  const actor = await account();
  const base = await ticket(actor.user.id);
  await action(base.id, actor.user.id, actor.user.id);
  const instrumented = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } }, log: [{ emit: 'event', level: 'query' }] });
  const queries: string[] = [];
  instrumented.$on('query', event => queries.push(event.query));
  const spy = vi.spyOn(prismaModule, 'getPrisma').mockReturnValue(instrumented);
  try {
    queries.length = 0;
    const before = await getStaffDashboard(actor.user.id);
    const smallQueryCount = queries.length;
    const reference = await instrumented.ticket.findFirstOrThrow();
    const statuses = Object.values(TicketStatus), priorities = Object.values(ITPriority);
    await instrumented.ticket.createMany({ data: Array.from({ length: 1000 }, (_, i) => ({
      requesterId: reference.requesterId, categoryId: reference.categoryId, relatedSystemId: reference.relatedSystemId,
      ticketNumber: `PERF-${i}`, summary: 'Performance fixture', description: 'Not part of dashboard preview',
      assignedStaffId: i % 2 ? actor.user.id : null, currentStatus: statuses[i % statuses.length], itPriority: priorities[i % priorities.length],
    })) });
    const inserted = await instrumented.ticket.findMany({ where: { ticketNumber: { startsWith: 'PERF-' } }, select: { id: true } });
    await instrumented.actionTaken.createMany({ data: Array.from({ length: 3000 }, (_, i) => ({
      ticketId: inserted[i % inserted.length].id, performedById: actor.user.id, assignedToId: actor.user.id,
      description: 'Planned performance fixture', status: 'PLANNED' as const,
    })) });
    const times: number[] = [];
    let bytes = 0;
    for (let i = 0; i < 3; i++) {
      queries.length = 0;
      const start = performance.now();
      const result = await getStaffDashboard(actor.user.id);
      times.push(Number((performance.now() - start).toFixed(2)));
      expect(queries.length).toBe(smallQueryCount);
      expect(result.recentTickets).toHaveLength(5);
      expect(result.myActions).toHaveLength(5);
      expect(Object.values(result.counts.byStatus).reduce((a, b) => a + b, 0)).toBe(Object.values(before.counts.byStatus).reduce((a, b) => a + b, 0) + 1000);
      expect(Object.values(result.counts.byPriority).reduce((a, b) => a + b, 0)).toBe(Object.values(before.counts.byPriority).reduce((a, b) => a + b, 0) + 1000);
      // Dataset size cannot expand the response into an unbounded Ticket/Action collection.
      bytes = Buffer.byteLength(JSON.stringify(result));
      expect(bytes).toBeLessThan(50_000);
    }
    const [recentPlan] = await instrumented.$queryRaw<Prisma.JsonObject[]>`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id FROM "tickets" ORDER BY "updatedAt" DESC, id DESC LIMIT 5`;
    const [actionPlan] = await instrumented.$queryRaw<Prisma.JsonObject[]>`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id FROM "actions_taken" WHERE "assignedToId" = ${actor.user.id} AND status = 'PLANNED' ORDER BY "createdAt" ASC, id ASC LIMIT 5`;
    console.log('DASH-PERF-01', JSON.stringify({ addedTickets: 1000, addedActions: 3000, queryCount: smallQueryCount, repeatedReadMs: times, responseBytes: bytes, recentPlan, actionPlan }));
  } finally {
    spy.mockRestore();
    await instrumented.$disconnect();
  }
}, 30_000);
