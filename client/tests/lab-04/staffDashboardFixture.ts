import type { StaffDashboardResponse, OperationalStatus, OperationalPriority } from '../../src/api';
export const statuses: OperationalStatus[] = ['NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CLOSED','REOPENED','CANCELLED'];
export const priorities: OperationalPriority[] = ['LOW','MEDIUM','HIGH','URGENT'];
export const dashboard: StaffDashboardResponse = {
  asOf:'2026-10-16T12:00:00Z',
  counts:{unassignedActive:7,myActive:3,byStatus:Object.fromEntries(statuses.map((s,i)=>[s,i])) as StaffDashboardResponse['counts']['byStatus'],byPriority:{LOW:1,MEDIUM:2,HIGH:3,URGENT:4}},
  recentTickets:[{id:7,ticketNumber:'OPS-7',summary:'Printer issue',currentStatus:'OPEN',itPriority:'HIGH',updatedAt:'2026-10-15T12:00:00Z'}],
  myActions:[{id:9,description:'Check printer',status:'PLANNED',createdAt:'2020-01-01T00:00:00Z',ticket:{id:7,ticketNumber:'OPS-7',currentStatus:'CANCELLED'}}],
  drillDowns:{unassignedActive:{destination:'ticket-queue',filters:{statusGroup:'active',assignedStaffId:'unassigned'}},myActive:{destination:'ticket-queue',filters:{statusGroup:'active',assignedStaffId:'me'}},
    byStatus:Object.fromEntries(statuses.map(s=>[s,{destination:'ticket-queue',filters:{currentStatus:s}}])) as StaffDashboardResponse['drillDowns']['byStatus'],
    byPriority:Object.fromEntries(priorities.map(p=>[p,{destination:'ticket-queue',filters:{itPriority:p}}])) as StaffDashboardResponse['drillDowns']['byPriority']},
};
