import { ITPriority, Prisma, TicketStatus } from '@prisma/client';
import { ticketFields } from '../utils/ticketFields.js';
import { getPrisma } from '../prisma.js';
import { workflowRevision, actionId } from '../utils/actionValidation.js';
import { isValidStatusTransition } from '../utils/statusTransition.js';

export class WorkflowError extends Error {
  constructor(public status: number, public code: string, message: string, public blockingWork?: { planned: number; followUp: number }) { super(message); }
}

// All Ticket workflow and Action writes serialize on this same parent row.
export async function lockTicket(tx: Prisma.TransactionClient, ticketId: number) {
  const rows = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM tickets WHERE id = ${ticketId} FOR UPDATE`;
  if (!rows.length) throw new WorkflowError(404, 'RESOURCE_NOT_FOUND', 'Ticket not found.');
}

const select = {
  ...ticketFields,
  requester: { select: { id: true, name: true, email: true } },
  assignedStaff: { select: { id: true, name: true, email: true, role: true } },
  category: true, relatedSystem: true,
} satisfies Prisma.TicketSelect;

export async function mutateTicketWorkflow(ticketId: number, operation: 'assign' | 'priority' | 'status', body: Record<string, unknown>) {
  const revision = workflowRevision(body.workflowRevision);
  if (revision === null) throw new WorkflowError(400, 'INVALID_WORKFLOW_REVISION', 'A nonnegative integer workflowRevision is required.');
  return getPrisma().$transaction(async tx => {
    await lockTicket(tx, ticketId);
    const ticket = await tx.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: ticketFields });
    if (ticket.workflowRevision !== revision) throw new WorkflowError(409, 'STALE_REVISION', 'Ticket changed; refresh before retrying.');
    const data: Prisma.TicketUncheckedUpdateInput = { workflowRevision: { increment: 1 } };
    if (operation === 'assign') {
      const target = body.assignedStaffId;
      if (target !== null) {
        if (actionId(target) === null) throw new WorkflowError(400, 'INVALID_ASSIGNMENT_TARGET', 'An active IT Staff or Administrator target is required.');
        const user = await tx.user.findUnique({ where: { id: target as number }, select: { role: true, isActive: true } });
        if (!user?.isActive || !['IT_STAFF', 'ADMINISTRATOR'].includes(user.role)) throw new WorkflowError(400, 'INVALID_ASSIGNMENT_TARGET', 'Target must be an active IT Staff or Administrator.');
      }
      data.assignedStaffId = target as number | null;
    } else if (operation === 'priority') {
      if (!Object.values(ITPriority).includes(body.itPriority as ITPriority)) throw new WorkflowError(400, 'INVALID_IT_PRIORITY', 'Valid IT Priority (LOW, MEDIUM, HIGH, URGENT) is required.');
      data.itPriority = body.itPriority as ITPriority;
    } else {
      const status = body.status as TicketStatus;
      if (!Object.values(TicketStatus).includes(status) || !isValidStatusTransition(ticket.currentStatus, status)) throw new WorkflowError(400, 'INVALID_STATUS_TRANSITION', 'Invalid ticket status transition.');
      if (status === 'RESOLVED' && body.resolutionSummary !== undefined) {
        if (typeof body.resolutionSummary !== 'string' || body.resolutionSummary.trim().length > 1000) throw new WorkflowError(400, 'INVALID_RESOLUTION_SUMMARY', 'Resolution summary must be text of at most 1000 characters.');
        data.resolutionSummary = body.resolutionSummary.trim() || null;
      }
      if (status === 'RESOLVED' || status === 'CLOSED') {
        const [planned, followUp] = await Promise.all([
          tx.actionTaken.count({ where: { ticketId, status: 'PLANNED' } }),
          tx.actionTaken.count({ where: { ticketId, status: 'COMPLETED', followUpRequired: true } }),
        ]);
        if (planned || followUp) throw new WorkflowError(409, 'RESOLUTION_BLOCKED', 'Outstanding Actions block resolution or closure. Review Actions Taken.', { planned, followUp });
      }
      data.currentStatus = status;
    }
    return tx.ticket.update({ where: { id: ticketId }, data, select });
  });
}
