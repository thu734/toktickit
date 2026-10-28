import type { Prisma } from '@prisma/client';

// Preserve the inherited public Ticket contract. Creation retry metadata is
// private to the creation service and must not become an implicit read dependency.
export const ticketFields = {
  id: true, ticketNumber: true, summary: true, description: true,
  requestedPriority: true, itPriority: true, currentStatus: true,
  resolutionSummary: true, workflowRevision: true,
  requesterId: true, assignedStaffId: true, categoryId: true, relatedSystemId: true,
  createdAt: true, updatedAt: true,
} satisfies Prisma.TicketSelect;
