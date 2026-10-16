import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import * as api from '../../src/api';
const owner:api.User={id:1,name:'Requester',email:'owner@test.local',role:'REQUESTER',isActive:true,mustChangePassword:false};
const empty={items:[],pagination:{page:1,limit:10,totalItems:0,totalPages:1}};
const data:api.RequesterDashboardResponse={asOf:'2026-10-16T12:00:00Z',counts:{active:2,waitingForRequester:1,resolved:0},
  recentTickets:[{id:7,ticketNumber:'DASH-TICKET-7',summary:'Recent owned issue',currentStatus:'OPEN',updatedAt:'2026-10-16T11:00:00Z'}],
  drillDowns:{active:{destination:'my-tickets',filters:{statusGroup:'active'}},waitingForRequester:{destination:'my-tickets',filters:{currentStatus:'WAITING_FOR_REQUESTER'}},resolved:{destination:'my-tickets',filters:{currentStatus:'RESOLVED'}}}};
beforeEach(()=>{
  vi.spyOn(api,'fetchCurrentUser').mockResolvedValue(owner);vi.spyOn(api,'fetchCategories').mockResolvedValue([]);
  vi.spyOn(api,'fetchTickets').mockResolvedValue(empty);vi.spyOn(api,'fetchStaffTickets').mockResolvedValue(empty);vi.spyOn(api,'fetchAdminUsers').mockResolvedValue([]);
  vi.spyOn(api,'fetchRequesterDashboard').mockResolvedValue(data);vi.spyOn(api,'fetchActions').mockResolvedValue({actions:[],workflowRevision:0});vi.spyOn(api,'fetchTicketComments').mockResolvedValue([]);
});
afterEach(()=>vi.restoreAllMocks());
describe('Requester dashboard application integration',()=>{
  it('preserves My Tickets landing and adds requester-only active Dashboard navigation',async()=>{
    render(<App/>);await screen.findByText('No Tickets Yet');expect(api.fetchRequesterDashboard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Dashboard'}));expect(await screen.findByRole('heading',{name:'Requester Dashboard'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Dashboard'})).toHaveAttribute('aria-current','page');
  });
  it.each(['active','waitingForRequester','resolved']as const)('applies %s drill-down then ordinary My Tickets clears it',async metric=>{
    render(<App/>);await screen.findByText('No Tickets Yet');fireEvent.click(screen.getByRole('button',{name:'Dashboard'}));
    const labels={active:'Active Tickets (2)',waitingForRequester:'Waiting for Requester (1)',resolved:'Resolved Tickets (0)'};
    fireEvent.click(await screen.findByRole('button',{name:`View ${labels[metric]}`}));
    await waitFor(()=>expect(api.fetchTickets).toHaveBeenLastCalledWith(expect.objectContaining({...data.drillDowns[metric].filters,page:1,sortBy:'updatedAt',sortOrder:'desc'}),1));
    expect(screen.getByLabelText('Current Status')).toHaveValue(metric==='active'?'ACTIVE':metric==='resolved'?'RESOLVED':'WAITING_FOR_REQUESTER');
    fireEvent.click(screen.getByRole('button',{name:/My Tickets/}));
    await waitFor(()=>expect(api.fetchTickets).toHaveBeenLastCalledWith(expect.objectContaining({statusGroup:undefined,currentStatus:undefined,page:1}),1));
    expect(screen.getByLabelText('Current Status')).toHaveValue('ALL');
  });
  it('opens a recent Ticket through existing Requester Ticket Detail',async()=>{
    vi.spyOn(api,'fetchTicketDetail').mockResolvedValue({id:7,ticketNumber:'DASH-TICKET-7',summary:'Recent owned issue',description:'Ticket detail body',requestedPriority:'MEDIUM',itPriority:'MEDIUM',currentStatus:'OPEN',requesterId:1,categoryId:1,relatedSystemId:1,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-10-16T11:00:00Z',requester:{...owner,department:'IT'},attachments:[]});
    render(<App/>);await screen.findByText('No Tickets Yet');fireEvent.click(screen.getByRole('button',{name:'Dashboard'}));
    fireEvent.click(await screen.findByRole('button',{name:'Open Ticket DASH-TICKET-7'}));await screen.findByText('Ticket detail body');
    expect(api.fetchTicketDetail).toHaveBeenCalledWith(7,0);expect(screen.getByRole('button',{name:/Problem Appears Resolved/})).toBeInTheDocument();
  });
  it.each([{role:'IT_STAFF' as const,heading:'IT Support Ticket Queue'},{role:'ADMINISTRATOR' as const,heading:'User Management'}])('preserves $role landing without Requester Dashboard access',async({role,heading})=>{
    vi.mocked(api.fetchCurrentUser).mockResolvedValue({...owner,role});render(<App/>);
    await screen.findByRole('heading',{name:heading});expect(screen.queryByRole('button',{name:'Dashboard'})).not.toBeInTheDocument();expect(api.fetchRequesterDashboard).not.toHaveBeenCalled();
  });
});
