import { Prisma, TicketStatus } from '@prisma/client';
import { getPrisma } from '../prisma.js';

export const ACTIVE_TICKET_STATUSES: TicketStatus[] = ['NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED'];

export async function getRequesterDashboard(requesterId: number) {
  return getPrisma().$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    // PostgreSQL supplies the transaction's timestamp; this first SELECT also
    // establishes the repeatable-read snapshot used by every metric/preview.
    const [snapshot] = await tx.$queryRaw<Array<{ asOf: Date }>>`SELECT transaction_timestamp() AS "asOf"`;
    const active = await tx.ticket.count({where:{requesterId,currentStatus:{in:ACTIVE_TICKET_STATUSES}}});
    const newTickets = await tx.ticket.count({where:{requesterId,currentStatus:'NEW'}});
    const open = await tx.ticket.count({where:{requesterId,currentStatus:'OPEN'}});
    const inProgress = await tx.ticket.count({where:{requesterId,currentStatus:'IN_PROGRESS'}});
    const reopened = await tx.ticket.count({where:{requesterId,currentStatus:'REOPENED'}});
    const waitingForRequester = await tx.ticket.count({where:{requesterId,currentStatus:'WAITING_FOR_REQUESTER'}});
    const resolved = await tx.ticket.count({where:{requesterId,currentStatus:'RESOLVED'}});
    const recentTickets = await tx.ticket.findMany({where:{requesterId},orderBy:[{updatedAt:'desc'},{id:'desc'}],take:5,
      select:{id:true,ticketNumber:true,summary:true,currentStatus:true,updatedAt:true}});
    return {asOf:snapshot.asOf,counts:{active,new:newTickets,open,inProgress,waitingForRequester,resolved,reopened},recentTickets,
      drillDowns:{active:{destination:'my-tickets',filters:{statusGroup:'active'}},
        new:{destination:'my-tickets',filters:{currentStatus:'NEW'}},
        open:{destination:'my-tickets',filters:{currentStatus:'OPEN'}},
        inProgress:{destination:'my-tickets',filters:{currentStatus:'IN_PROGRESS'}},
        reopened:{destination:'my-tickets',filters:{currentStatus:'REOPENED'}},
        waitingForRequester:{destination:'my-tickets',filters:{currentStatus:'WAITING_FOR_REQUESTER'}},
        resolved:{destination:'my-tickets',filters:{currentStatus:'RESOLVED'}}}};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
