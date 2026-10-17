import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ActionStatus, ITPriority, TicketStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import app from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

export const csrf = { 'X-Requested-With': 'XMLHttpRequest' };
export async function assertIsolated() {
  const [target] = await getPrisma().$queryRaw<Array<{db:string;schema:string}>>`SELECT current_database() AS db, current_schema() AS schema`;
  if (target.db !== 'toktickit_test' || !/^lab4_test_[a-f0-9]{32}$/.test(target.schema)) throw new Error('Unsafe dashboard test target');
}
export async function account(role: UserRole = 'IT_STAFF', locked = false) {
  const user = await getPrisma().user.create({data:{name:'Dashboard actor',email:`${randomUUID()}@test.local`,role,
    passwordHash:await bcrypt.hash('TestPassword123!',4),mustChangePassword:locked}});
  const agent=request.agent(app);
  await agent.post('/api/auth/login').set(csrf).send({email:user.email,password:'TestPassword123!'}).expect(200);
  return {user,agent};
}
export async function ticket(ownerId: number | null = null, status: TicketStatus = 'OPEN', priority: ITPriority = 'MEDIUM', updatedAt = new Date('2050-01-01T00:00:00Z')) {
  const requester=await getPrisma().user.findFirstOrThrow({where:{role:"REQUESTER"}});
  const category=await getPrisma().category.findFirstOrThrow(),system=await getPrisma().relatedSystem.findFirstOrThrow();
  return getPrisma().ticket.create({data:{requesterId:requester.id,categoryId:category.id,relatedSystemId:system.id,
    ticketNumber:`STAFF-DASH-${randomUUID()}`,summary:'Operational preview',description:'Full description not in preview',assignedStaffId:ownerId,currentStatus:status,itPriority:priority,updatedAt}});
}
export async function action(ticketId:number, performer:number, assignedToId:number|null, status:ActionStatus='PLANNED') {
  return getPrisma().actionTaken.create({data:{ticketId,performedById:performer,assignedToId,status,description:'Assigned task',result:status==='PLANNED'?null:'Outcome',createdAt:new Date('2000-01-01T00:00:00Z')}});
}
