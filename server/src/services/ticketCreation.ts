import { createHash } from 'node:crypto';
import { Prisma, type RequestedPriority } from '@prisma/client';
import { getPrisma } from '../prisma.js';
import { generateNextTicketNumber } from '../utils/ticketNumber.js';

export class TicketCreationError extends Error {
  constructor(public status: 400 | 409, message: string, public code?: string, public details?: Record<string, string>) { super(message); }
}

type CreationPayload = { categoryId: number; relatedSystemId: number; requestedPriority: RequestedPriority; summary: string; description: string };
const include = {
  requester: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

/** One narrow retry boundary for Ticket creation; no session/process cache. */
export async function createTicketOnce(requesterId: number, payload: CreationPayload, requestKey?: string) {
  const hash = createHash('sha256').update(JSON.stringify([
    payload.categoryId, payload.relatedSystemId, payload.requestedPriority, payload.summary, payload.description,
  ])).digest('hex');
  const ticket = await getPrisma().$transaction(async tx => {
    // The inherited next-number allocator must run with the insert/replay lookup.
    // This also prevents different Requesters racing for the same Ticket number.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(334, 26)::text`;
    if (requestKey) {
      const existing = await tx.ticket.findUnique({ where: { requesterId_creationRequestKey: { requesterId, creationRequestKey: requestKey } }, include });
      if (existing) {
        if (existing.creationPayloadHash !== hash) throw new TicketCreationError(409,
          'This submission key was already used with different Ticket details. Retry the original details or start a new Ticket submission.', 'CREATION_REQUEST_CONFLICT');
        return existing;
      }
    }
    const details: Record<string, string> = {};
    const category = await tx.category.findUnique({ where: { id: payload.categoryId } });
    if (!category?.isActive) details.categoryId = 'Selected Category does not exist or is inactive.';
    const system = await tx.relatedSystem.findUnique({ where: { id: payload.relatedSystemId } });
    if (!system?.isActive) details.relatedSystemId = 'Selected Related System does not exist or is inactive.';
    if (Object.keys(details).length) throw new TicketCreationError(400, 'Validation failed for ticket creation.', undefined, details);
    return tx.ticket.create({ data: {
      ...payload, requesterId, ticketNumber: await generateNextTicketNumber(undefined, tx),
      itPriority: payload.requestedPriority, currentStatus: 'NEW',
      creationRequestKey: requestKey ?? null, creationPayloadHash: requestKey ? hash : null,
    }, include });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  // Retry bookkeeping is not part of the creation response.
  const { creationRequestKey: _key, creationPayloadHash: _hash, ...response } = ticket;
  return response;
}
