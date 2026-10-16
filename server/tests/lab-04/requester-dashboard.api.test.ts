import { beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { TicketStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import app from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const csrf = { 'X-Requested-With': 'XMLHttpRequest' };
const path = '/api/dashboard/requester';
let categoryId: number, relatedSystemId: number;
async function account(role: UserRole = 'REQUESTER', locked = false) {
  const user = await getPrisma().user.create({ data: { name: 'Dashboard fixture', email: `${randomUUID()}@test.local`, role,
    passwordHash: await bcrypt.hash('TestPassword123!',4), mustChangePassword: locked } });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').set(csrf).send({email:user.email,password:'TestPassword123!'}).expect(200);
  return {user,agent};
}
async function ticket(requesterId: number, currentStatus: TicketStatus = 'NEW', updatedAt = new Date('2020-01-01T00:00:00Z')) {
  return getPrisma().ticket.create({data:{ticketNumber:`DASH-${randomUUID()}`,summary:'Owned preview',description:'Private full description',
    requesterId,categoryId,relatedSystemId,currentStatus,updatedAt}});
}
beforeAll(async()=>{
  const [target]=await getPrisma().$queryRaw<Array<{db:string;schema:string}>>`SELECT current_database() AS db, current_schema() AS schema`;
  expect(target.db).toBe('toktickit_test');expect(target.schema).toMatch(/^lab4_test_[a-f0-9]{32}$/);
  ({categoryId,relatedSystemId}=await getPrisma().ticket.findFirstOrThrow());
});

describe('REQ-DASH-01 authoritative owned metrics and access',()=>{
  it('counts exactly the five active statuses, waiting and current resolved state',async()=>{
    const {user,agent}=await account();
    for(const status of Object.values(TicketStatus)) await ticket(user.id,status);
    await ticket(user.id,'WAITING_FOR_REQUESTER');await ticket(user.id,'RESOLVED');
    const res=await agent.get(path).expect(200);
    expect(res.body.counts).toEqual({active:6,new:1,open:1,inProgress:1,waitingForRequester:2,resolved:2,reopened:1});
    expect(Object.keys(res.body).sort()).toEqual(['asOf','counts','drillDowns','recentTickets']);
    expect(res.body.recentTickets).toHaveLength(5);
    expect(res.body.drillDowns).toEqual({active:{destination:'my-tickets',filters:{statusGroup:'active'}},
      new:{destination:'my-tickets',filters:{currentStatus:'NEW'}},open:{destination:'my-tickets',filters:{currentStatus:'OPEN'}},
      inProgress:{destination:'my-tickets',filters:{currentStatus:'IN_PROGRESS'}},reopened:{destination:'my-tickets',filters:{currentStatus:'REOPENED'}},
      waitingForRequester:{destination:'my-tickets',filters:{currentStatus:'WAITING_FOR_REQUESTER'}},resolved:{destination:'my-tickets',filters:{currentStatus:'RESOLVED'}}});
  });
  it('reconciles Active from five distinct backend buckets and keeps OPEN exact',async()=>{
    const {user,agent}=await account();
    const frequencies:Partial<Record<TicketStatus,number>>={NEW:3,OPEN:2,IN_PROGRESS:4,WAITING_FOR_REQUESTER:1,REOPENED:5,RESOLVED:6,CLOSED:2,CANCELLED:2};
    for(const [status,count] of Object.entries(frequencies)) for(let i=0;i<count;i++) await ticket(user.id,status as TicketStatus);
    const {counts}= (await agent.get(path).expect(200)).body;
    expect(counts).toEqual({active:15,new:3,open:2,inProgress:4,waitingForRequester:1,resolved:6,reopened:5});
    expect(counts.active).toBe(counts.new+counts.open+counts.inProgress+counts.waitingForRequester+counts.reopened);
  });
  it('ignores forged identity and keeps both Requesters isolated',async()=>{
    const a=await account(),b=await account();await ticket(a.user.id,'OPEN');for(const status of Object.values(TicketStatus)) await ticket(b.user.id,status);
    const res=await a.agent.get(path).query({requesterId:b.user.id,userId:b.user.id}).set('X-Development-Requester-Id',String(b.user.id)).expect(200);
    expect(res.body.counts).toEqual({active:1,new:0,open:1,inProgress:0,waitingForRequester:0,resolved:0,reopened:0});
    expect(res.body.recentTickets).toHaveLength(1);expect(res.body.recentTickets[0].currentStatus).toBe('OPEN');
    expect((await b.agent.get(path).expect(200)).body.counts).toEqual({active:5,new:1,open:1,inProgress:1,waitingForRequester:1,resolved:1,reopened:1});
  });
  it.each([false,true])('requires authentication even with a legacy header (%s)',async header=>{
    const req=request(app).get(path);if(header)req.set('X-Development-Requester-Id','1');
    expect((await req.expect(401)).body.code).toBe('UNAUTHENTICATED');
  });
  it.each(['IT_STAFF','ADMINISTRATOR'] as UserRole[])('forbids %s',async role=>{
    const {agent}=await account(role);expect((await agent.get(path).expect(403)).body.code).toBe('FORBIDDEN');
  });
  it('preserves first-password lock and current activity/role checks',async()=>{
    const locked=await account('REQUESTER',true);
    expect((await locked.agent.get(path).expect(403)).body.code).toBe('MUST_CHANGE_PASSWORD');
    const inactive=await account();await getPrisma().user.update({where:{id:inactive.user.id},data:{isActive:false}});await inactive.agent.get(path).expect(401);
    const changed=await account();await getPrisma().user.update({where:{id:changed.user.id},data:{role:'IT_STAFF'}});await changed.agent.get(path).expect(403);
  });
  it('returns real zeros and an empty list for an empty owner',async()=>{
    const {agent}=await account();const res=await agent.get(path).expect(200);
    expect(res.body.counts).toEqual({active:0,new:0,open:0,inProgress:0,waitingForRequester:0,resolved:0,reopened:0});expect(res.body.recentTickets).toEqual([]);
    expect(new Date(res.body.asOf).toISOString()).toBe(res.body.asOf);
  });
  it('does not expose private or unbounded Ticket data',async()=>{
    const {user,agent}=await account();const t=await ticket(user.id,'CLOSED');
    await getPrisma().internalNote.create({data:{ticketId:t.id,authorId:user.id,content:'Secret internal fixture'}});
    const res=await agent.get(path).expect(200);
    expect(Object.keys(res.body.recentTickets[0]).sort()).toEqual(['currentStatus','id','summary','ticketNumber','updatedAt']);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Secret internal fixture|Private full description|filePath/);
  });
  it('returns a safe failure rather than fake zero metrics when the dashboard query fails',async()=>{
    const {agent}=await account();const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    const fault=vi.spyOn(getPrisma(),'$transaction').mockRejectedValueOnce(new Error('SQL credential-sensitive failure'));
    try {const res=await agent.get(path).expect(500);expect(res.body).not.toHaveProperty('counts');expect(JSON.stringify(res.body)).not.toMatch(/SQL|credential|stack/);}
    finally{fault.mockRestore();log.mockRestore();}
  });
});

describe('REQ-TIME-01 bounded ordering and consistent PostgreSQL snapshot',()=>{
  it.each([1,4,5,9])('returns the newest five of %i owned Tickets with deterministic ID ties and no cutoff',async size=>{
    const {user,agent}=await account();const rows=[];
    for(let i=0;i<size;i++) rows.push(await ticket(user.id,i%2?'CANCELLED':'CLOSED',new Date(i<2?'1990-01-01T00:00:00Z':'2000-01-01T00:00:00Z')));
    const res=await agent.get(path).query({limit:1000,since:'2026-01-01'}).expect(200);
    const expected=[...rows].sort((a,b)=>b.updatedAt.getTime()-a.updatedAt.getTime()||b.id-a.id).slice(0,5);
    expect(res.body.recentTickets.map((t:{id:number})=>t.id)).toEqual(expected.map(t=>t.id));
    expect(res.body.counts).toEqual({active:0,new:0,open:0,inProgress:0,waitingForRequester:0,resolved:0,reopened:0});
  });
  it('keeps asOf, all counts and previews in the original snapshot across a real concurrent commit',async()=>{
    const prisma=getPrisma(), {user,agent}=await account();const t=await ticket(user.id,'OPEN');
    let release!:()=>void,ready!:()=>void;
    const paused=new Promise<void>(resolve=>{ready=resolve;});const resume=new Promise<void>(resolve=>{release=resolve;});
    let enabled=true,used=false;
    let databaseAsOf: Date | undefined;
    // Pause AFTER the first real count, leaving the transaction and snapshot open.
    // The concurrent write uses another pool connection and commits before remaining reads.
    prisma.$use(async(params,next)=>{
      const value=await next(params);
      if(enabled && params.action==='queryRaw' && Array.isArray(value) && value[0]?.asOf instanceof Date) databaseAsOf=value[0].asOf;
      if(enabled&&!used&&params.model==='Ticket'&&params.action==='count'&&params.runInTransaction){used=true;ready();await resume;}
      return value;
    });
    const [before]=await prisma.$queryRaw<Array<{time:Date}>>`SELECT clock_timestamp() AS time`;
    const response=agent.get(path).then(r=>r);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try{
      await Promise.race([paused,response.then(()=>{throw new Error('Dashboard did not reach snapshot barrier');}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Snapshot barrier timeout')),3000);})]);
      const [boundary]=await prisma.$queryRaw<Array<{time:Date}>>`SELECT clock_timestamp() AS time`;
      await prisma.ticket.update({where:{id:t.id},data:{currentStatus:'RESOLVED',summary:'New committed summary'}});
      await ticket(user.id,'WAITING_FOR_REQUESTER',new Date());
      for(const status of ['NEW','IN_PROGRESS','REOPENED'] as TicketStatus[]) await ticket(user.id,status,new Date());
      release();const res=await response;expect(res.status).toBe(200);
      expect(res.body.counts).toEqual({active:1,new:0,open:1,inProgress:0,waitingForRequester:0,resolved:0,reopened:0});
      expect(res.body.recentTickets).toHaveLength(1);expect(res.body.recentTickets[0]).toMatchObject({id:t.id,currentStatus:'OPEN',summary:'Owned preview',updatedAt:t.updatedAt.toISOString()});
      expect(databaseAsOf).toBeInstanceOf(Date);expect(res.body.asOf).toBe(databaseAsOf!.toISOString());
      const asOf=new Date(res.body.asOf).getTime();expect(asOf).toBeGreaterThanOrEqual(before.time.getTime());expect(asOf).toBeLessThanOrEqual(boundary.time.getTime());
      const fresh=await agent.get(path).expect(200);expect(fresh.body.counts).toEqual({active:4,new:1,open:0,inProgress:1,waitingForRequester:1,resolved:1,reopened:1});expect(fresh.body.recentTickets).toHaveLength(5);
    }finally{enabled=false;release();if(timer)clearTimeout(timer);await response;}
  });
});


describe('REQ-DASH-01 metric / drill-down parity before pagination',()=>{
  it('returns all active owned Tickets across pages despite interleaved inactive and other-owner records',async()=>{
    const {user,agent}=await account(),other=await account();const expected=[];
    const active:TicketStatus[]=['NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED'];
    for(let i=0;i<15;i++) {
      expected.push(await ticket(user.id,active[i%5],new Date(2020,0,i+1)));
      await ticket(user.id,i%2?'CLOSED':'CANCELLED',new Date(2030,0,i+1));
      await ticket(other.user.id,active[i%5],new Date(2040,0,i+1));
    }
    const dashboard=(await agent.get(path).expect(200)).body;
    expect(dashboard.counts.active).toBe(15);
    const all=[];
    for(let page=1;page<=4;page++) {
      const res=await agent.get('/api/tickets').query({...dashboard.drillDowns.active.filters,page,limit:4,sortBy:'updatedAt',sortOrder:'desc',requesterId:other.user.id}).expect(200);
      expect(res.body.pagination).toMatchObject({totalItems:15,totalPages:4,page});
      expect(res.body.items).toHaveLength(page===4?3:4);
      all.push(...res.body.items.map((t:{id:number})=>t.id));
    }
    expect(all).toEqual(expected.reverse().map(t=>t.id));
    for(const metric of ['new','open','inProgress','waitingForRequester','resolved','reopened']) {
      const res=await agent.get('/api/tickets').query(dashboard.drillDowns[metric].filters).expect(200);
      expect(res.body.pagination.totalItems).toBe(dashboard.counts[metric]);
    }
    const intersection=await agent.get('/api/tickets').query({statusGroup:'active',currentStatus:'RESOLVED'}).expect(200);
    expect(intersection.body.pagination.totalItems).toBe(0);expect(intersection.body.items).toEqual([]);
    const ordinary=await agent.get('/api/tickets').expect(200);expect(ordinary.body.pagination.totalItems).toBe(30);
    const recentFirst=dashboard.recentTickets[0];
    const detail=await agent.get(`/api/tickets/${recentFirst.id}`).expect(200);expect(detail.body.requesterId).toBe(user.id);
  });
  it('validates the new group filter without introducing a Ticket status',async()=>{
    const {agent}=await account();
    await agent.get('/api/tickets?statusGroup=unknown').expect(400);
    await agent.get('/api/tickets?statusGroup=active&statusGroup=active').expect(400);
  });
});
