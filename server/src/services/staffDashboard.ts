import { ITPriority, Prisma, TicketStatus } from '@prisma/client';
import { getPrisma } from '../prisma.js';
import { ACTIVE_TICKET_STATUSES } from './requesterDashboard.js';

export async function getStaffDashboard(userId: number) {
  return getPrisma().$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const [snapshot] = await tx.$queryRaw<Array<{ asOf: Date }>>`SELECT transaction_timestamp() AS "asOf"`;
    const unassignedActive = await tx.ticket.count({ where: { assignedStaffId: null, currentStatus: { in: ACTIVE_TICKET_STATUSES } } });
    const myActive = await tx.ticket.count({ where: { assignedStaffId: userId, currentStatus: { in: ACTIVE_TICKET_STATUSES } } });
    const statusGroups = await tx.ticket.groupBy({ by: ['currentStatus'], _count: { _all: true } });
    const priorityGroups = await tx.ticket.groupBy({ by: ['itPriority'], _count: { _all: true } });
    const byStatus = Object.fromEntries(Object.values(TicketStatus).map(status => [status, statusGroups.find(group => group.currentStatus === status)?._count._all ?? 0]));
    const byPriority = Object.fromEntries(Object.values(ITPriority).map(priority => [priority, priorityGroups.find(group => group.itPriority === priority)?._count._all ?? 0]));
    const recentTickets = await tx.ticket.findMany({ orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 5,
      select: { id: true, ticketNumber: true, summary: true, currentStatus: true, itPriority: true, updatedAt: true } });
    const myActions = await tx.actionTaken.findMany({ where: { assignedToId: userId, status: 'PLANNED' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5,
      select: { id: true, description: true, createdAt: true, status: true,
        ticket: { select: { id: true, ticketNumber: true, currentStatus: true } } } });
    return { asOf: snapshot.asOf, counts: { unassignedActive, myActive, byStatus, byPriority }, recentTickets, myActions,
      drillDowns: {
        unassignedActive: { destination: 'ticket-queue', filters: { statusGroup: 'active', assignedStaffId: 'unassigned' } },
        myActive: { destination: 'ticket-queue', filters: { statusGroup: 'active', assignedStaffId: 'me' } },
        byStatus: Object.fromEntries(Object.values(TicketStatus).map(status => [status, { destination: 'ticket-queue', filters: { currentStatus: status } }])),
        byPriority: Object.fromEntries(Object.values(ITPriority).map(priority => [priority, { destination: 'ticket-queue', filters: { itPriority: priority } }])),
      } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
