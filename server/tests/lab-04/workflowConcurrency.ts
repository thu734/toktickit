import { expect } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";

export async function overlap(ticketId: number, run: () => Promise<request.Response>[]) {
  const prisma = getPrisma();
  let release!: () => void;
  let acquired!: (pid: number) => void;
  const unlocked = new Promise<void>(resolve => { release = resolve; });
  const locked = new Promise<number>(resolve => { acquired = resolve; });
  const holding = prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${ticketId} FOR UPDATE`;
    const [row] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
    acquired(row.pid);
    await unlocked;
  }, { timeout: 10000 });
  const pid = await Promise.race([locked, holding.then(() => { throw new Error("Lock was not acquired"); })]);
  const requests = run();
  let waiting = 0;
  try {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const [row] = await prisma.$queryRaw<Array<{ count: number }>>`
        WITH RECURSIVE waiters AS (
          SELECT pid FROM pg_stat_activity WHERE ${pid} = ANY(pg_blocking_pids(pid))
          UNION
          SELECT a.pid FROM pg_stat_activity a JOIN waiters w ON w.pid = ANY(pg_blocking_pids(a.pid))
        ) SELECT count(*)::int AS count FROM waiters`;
      waiting = row.count;
      if (waiting >= 2) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  } finally { release(); await holding; }
  const responses = await Promise.all(requests);
  expect(waiting).toBeGreaterThanOrEqual(2);
  return responses;
}

