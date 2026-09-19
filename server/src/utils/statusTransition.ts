import { TicketStatus } from "@prisma/client";

/**
 * Validates whether a transition from currentStatus to targetStatus is allowed
 * according to the Lab 3 Ticket Status Transition Matrix (BR-14).
 * 
 * Matrix Definition:
 * - NEW: OPEN, IN_PROGRESS, CANCELLED
 * - OPEN: IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * - IN_PROGRESS: WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * - WAITING_FOR_REQUESTER: IN_PROGRESS, RESOLVED, CANCELLED
 * - RESOLVED: CLOSED, REOPENED
 * - CLOSED: REOPENED
 * - REOPENED: IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * - CANCELLED: (terminal state — no allowed transitions)
 */
export function isValidStatusTransition(currentStatus: TicketStatus, targetStatus: TicketStatus): boolean {
  if (currentStatus === targetStatus) {
    return false;
  }

  const allowedMap: Record<TicketStatus, TicketStatus[]> = {
    [TicketStatus.NEW]: [
      TicketStatus.OPEN,
      TicketStatus.IN_PROGRESS,
      TicketStatus.CANCELLED,
    ],
    [TicketStatus.OPEN]: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_FOR_REQUESTER,
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ],
    [TicketStatus.IN_PROGRESS]: [
      TicketStatus.WAITING_FOR_REQUESTER,
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ],
    [TicketStatus.WAITING_FOR_REQUESTER]: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ],
    [TicketStatus.RESOLVED]: [
      TicketStatus.CLOSED,
      TicketStatus.REOPENED,
    ],
    [TicketStatus.CLOSED]: [
      TicketStatus.REOPENED,
    ],
    [TicketStatus.REOPENED]: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_FOR_REQUESTER,
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ],
    [TicketStatus.CANCELLED]: [],
  };

  const allowedList = allowedMap[currentStatus] || [];
  return allowedList.includes(targetStatus);
}
