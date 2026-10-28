import { describe, expect, it } from 'vitest';
import { TicketStatus } from '@prisma/client';
import { isValidStatusTransition } from '../../src/utils/statusTransition.js';

// Independent approved contract, including same-state and terminal negatives.
export const matrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'IN_PROGRESS', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'], CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'], CANCELLED: [],
};
describe('WF-UNIT-01 approved eight-status matrix', () => {
  for (const from of Object.values(TicketStatus)) for (const to of Object.values(TicketStatus)) {
    it(`${from} -> ${to}`, () => expect(isValidStatusTransition(from, to)).toBe(matrix[from].includes(to)));
  }
});
