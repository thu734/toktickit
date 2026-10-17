import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ITPriority, TicketStatus } from '@prisma/client';
import request from 'supertest';
import app from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { account, action, assertIsolated, ticket } from './staffDashboardFixtures.js';

const path='/api/dashboard/staff';
const active=['NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED'];
beforeAll(assertIsolated);
async function expected(userId:number) {
  const tickets=await getPrisma().ticket.findMany();
  return {unassignedActive:tickets.filter(t=>t.assignedStaffId===null&&active.includes(t.currentStatus)).length,
    myActive:tickets.filter(t=>t.assignedStaffId===userId&&active.includes(t.currentStatus)).length,
    byStatus:Object.fromEntries(Object.values(TicketStatus).map(s=>[s,tickets.filter(t=>t.currentStatus===s).length])),
    byPriority:Object.fromEntries(Object.values(ITPriority).map(p=>[p,tickets.filter(t=>t.itPriority===p).length]))};
}

describe('STAFF-DASH-01 / handout 4.6 and 8.1',()=>{
  it('returns all zero buckets and empty previews for a genuinely empty operational dataset',async()=>{
    await assertIsolated();await getPrisma().ticket.deleteMany();
    const {agent}=await account();const res=await agent.get(path).expect(200);
    expect(res.body.counts).toEqual({unassignedActive:0,myActive:0,
      byStatus:Object.fromEntries(Object.values(TicketStatus).map(s=>[s,0])),byPriority:Object.fromEntries(Object.values(ITPriority).map(p=>[p,0]))});
    expect(res.body.myActions).toEqual([]);expect(res.body.recentTickets).toEqual([]);
  });
  it.each(['IT_STAFF','ADMINISTRATOR'] as const)('returns exact operational counts, every status/priority and bounded recent data for %s',async role=>{
    const {user,agent}=await account(role),other=await account();
    for(const status of Object.values(TicketStatus)) {
      await ticket(null,status,'LOW');await ticket(user.id,status,'HIGH');await ticket(other.user.id,status,'URGENT');
    }
    const response=await agent.get(path).query({userId:other.user.id,limit:1000}).expect(200);
    expect(response.body.counts).toEqual(await expected(user.id));
    expect(Object.keys(response.body.counts.byStatus)).toHaveLength(8);expect(Object.keys(response.body.counts.byPriority)).toHaveLength(4);
    const rows=await getPrisma().ticket.findMany({orderBy:[{updatedAt:'desc'},{id:'desc'}],take:5});
    expect(response.body.recentTickets.map((t:{id:number})=>t.id)).toEqual(rows.map(t=>t.id));
    expect(Object.keys(response.body.recentTickets[0]).sort()).toEqual(['currentStatus','id','itPriority','summary','ticketNumber','updatedAt']);
    expect(Object.keys(response.body).sort()).toEqual(['asOf','counts','drillDowns','myActions','recentTickets']);
    expect(response.body).not.toHaveProperty('userCounts');
  });
  it('separates performer, owner and assignee; shows only five oldest assigned PLANNED Actions including terminal-parent work',async()=>{
    const a=await account(),b=await account('ADMINISTRATOR');const t=await ticket(b.user.id,'CANCELLED');
    const included=[];
    for(let i=0;i<7;i++)included.push(await action(t.id,b.user.id,a.user.id));
    await action(t.id,a.user.id,null);await action(t.id,a.user.id,b.user.id);
    await action(t.id,a.user.id,a.user.id,'COMPLETED');await action(t.id,a.user.id,a.user.id,'CANCELLED');
    const res=await a.agent.get(path).query({userId:b.user.id,assignedToId:b.user.id,limit:1000}).set('X-Development-Requester-Id',String(b.user.id)).expect(200);
    expect(res.body.myActions.map((x:{id:number})=>x.id)).toEqual(included.slice(0,5).map(x=>x.id));
    expect(res.body.counts.myActive).toBe(0);
    expect(Object.keys(res.body.myActions[0]).sort()).toEqual(['createdAt','description','id','status','ticket']);
    for(const item of res.body.myActions){expect(item.status).toBe('PLANNED');expect(item.ticket).toMatchObject({id:t.id,currentStatus:'CANCELLED'});}
    const admin=await b.agent.get(path).expect(200);expect(admin.body.myActions).toHaveLength(1);
    await a.agent.get(`/api/staff/tickets/${t.id}`).expect(200);await a.agent.get(`/api/tickets/${t.id}/actions-taken`).expect(200);
  });
  it('ignores forged current-owner identity and returns only session-owner metrics',async()=>{
    const a=await account(),b=await account();await ticket(a.user.id);await ticket(b.user.id);await ticket(b.user.id);
    const res=await a.agent.get(path).query({userId:b.user.id,assignedStaffId:b.user.id}).expect(200);
    expect(res.body.counts).toEqual(await expected(a.user.id));expect(res.body.counts.myActive).toBe(1);
  });
  it('rejects unauthenticated/header-only/requester/locked/inactive/changed-role access',async()=>{
    await request(app).get(path).expect(401);await request(app).get(path).set('X-Development-Requester-Id','1').expect(401);
    const r=await account('REQUESTER');await r.agent.get(path).expect(403);
    const locked=await account('IT_STAFF',true);expect((await locked.agent.get(path).expect(403)).body.code).toBe('MUST_CHANGE_PASSWORD');
    for(const change of [{isActive:false},{role:'REQUESTER' as const}]){
      const a=await account('ADMINISTRATOR');await getPrisma().user.update({where:{id:a.user.id},data:change});await a.agent.get(path).expect('isActive'in change?401:403);
    }
  });
  it.each(['IT_STAFF','ADMINISTRATOR'] as const)('matches every count destination and active pagination for %s',async role=>{
    const {user,agent}=await account(role);
    for(let i=0;i<15;i++){await ticket(user.id,active[i%5] as TicketStatus);await ticket(null,active[i%5] as TicketStatus);}
    await ticket(user.id,'CLOSED');await ticket(null,'CANCELLED');
    const dashboard=(await agent.get(path).expect(200)).body;
    const destinations=[['unassignedActive',dashboard.drillDowns.unassignedActive],['myActive',dashboard.drillDowns.myActive],
      ...Object.entries(dashboard.drillDowns.byStatus),...Object.entries(dashboard.drillDowns.byPriority)] as Array<[string,{filters:Record<string,string>}]>;
    for(const [key,link]of destinations){
      const wanted=key in dashboard.counts?dashboard.counts[key]:key in dashboard.counts.byStatus?dashboard.counts.byStatus[key]:dashboard.counts.byPriority[key];
      const res=await agent.get('/api/staff/tickets').query({...link.filters,page:1,limit:3,sortBy:'updatedAt',sortOrder:'desc'}).expect(200);
      expect(res.body.pagination.totalItems).toBe(wanted);
      for(const row of res.body.data){
        if(link.filters.statusGroup)expect(active).toContain(row.currentStatus);
        if(link.filters.assignedStaffId==='me')expect(row.assignedStaffId).toBe(user.id);
        if(link.filters.assignedStaffId==='unassigned')expect(row.assignedStaffId).toBeNull();
        if(link.filters.currentStatus)expect(row.currentStatus).toBe(link.filters.currentStatus);
        if(link.filters.itPriority)expect(row.itPriority).toBe(link.filters.itPriority);
      }
      if(key==='myActive'){
        const ids=[];for(let page=1;page<=res.body.pagination.totalPages;page++){
          const part=await agent.get('/api/staff/tickets').query({...link.filters,page,limit:3,sortBy:'updatedAt',sortOrder:'desc'}).expect(200);ids.push(...part.body.data.map((x:{id:number})=>x.id));
        }
        expect(ids).toHaveLength(15);expect(new Set(ids).size).toBe(15);
      }
    }
    const t=dashboard.recentTickets[0];await agent.get(`/api/staff/tickets/${t.id}`).expect(200);await agent.get(`/api/tickets/${t.id}/actions-taken`).expect(200);
    const intersection=await agent.get('/api/staff/tickets').query({statusGroup:'active',currentStatus:'CLOSED'}).expect(200);expect(intersection.body.pagination.totalItems).toBe(0);
    await agent.get('/api/staff/tickets?statusGroup=unknown').expect(400);
  });
  it('returns safe errors rather than zero metrics after query failure',async()=>{
    const {agent}=await account();const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    const fault=vi.spyOn(getPrisma(),'$transaction').mockRejectedValueOnce(new Error('Sensitive SQL failure'));
    try{const res=await agent.get(path).expect(500);expect(res.body).not.toHaveProperty('counts');expect(JSON.stringify(res.body)).not.toMatch(/Sensitive|SQL|stack/);}
    finally{fault.mockRestore();log.mockRestore();}
  });
  it('keeps counts, previews and PostgreSQL asOf in one snapshot across concurrent changes',async()=>{
    const prisma=getPrisma(),a=await account(),b=await account();const t=await ticket(null,'OPEN');const task=await action(t.id,b.user.id,a.user.id);
    const before=await expected(a.user.id);let release!:()=>void,ready!:()=>void,enabled=true,used=false,asOf:Date|undefined;
    const paused=new Promise<void>(resolve=>{ready=resolve}),resume=new Promise<void>(resolve=>{release=resolve});
    prisma.$use(async(params,next)=>{
      const result=await next(params);
      if(enabled&&params.action==='queryRaw'&&Array.isArray(result)&&result[0]?.asOf instanceof Date)asOf=result[0].asOf;
      if(enabled&&!used&&params.model==='Ticket'&&params.action==='count'&&params.runInTransaction){used=true;ready();await resume;}
      return result;
    });
    const response=a.agent.get(path).then(r=>r);let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      await Promise.race([paused,response.then(()=>{throw new Error('Snapshot barrier missed')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Snapshot timeout')),3000)})]);
      await prisma.ticket.update({where:{id:t.id},data:{assignedStaffId:a.user.id,currentStatus:'RESOLVED',itPriority:'URGENT'}});
      await prisma.actionTaken.update({where:{id:task.id},data:{status:'COMPLETED',result:'Done'}});
      release();const res=await response;expect(res.status).toBe(200);expect(res.body.counts).toEqual(before);expect(res.body.asOf).toBe(asOf!.toISOString());
      expect(res.body.myActions.some((x:{id:number})=>x.id===task.id)).toBe(true);
      expect(res.body.recentTickets.find((x:{id:number})=>x.id===t.id)).toMatchObject({currentStatus:'OPEN',itPriority:'MEDIUM'});
      const fresh=await a.agent.get(path).expect(200);expect(fresh.body.counts).toEqual(await expected(a.user.id));expect(fresh.body.myActions).toEqual([]);
    }finally{enabled=false;release();if(timer)clearTimeout(timer);await response;}
  });

});
