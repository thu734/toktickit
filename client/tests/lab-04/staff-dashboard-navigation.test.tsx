import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import {fireEvent,render,screen,waitFor}from '@testing-library/react';
import App from '../../src/App';
import * as api from '../../src/api';
import {dashboard,statuses,priorities}from './staffDashboardFixture';
import {statusLabels,priorityLabels}from '../../src/components/StaffDashboard';
const user:api.User={id:1,name:'Staff',email:'staff@test.local',role:'IT_STAFF',isActive:true,mustChangePassword:false};
const empty={items:[],pagination:{page:1,limit:10,totalItems:0,totalPages:1}};
beforeEach(()=>{
  vi.spyOn(api,'fetchCurrentUser').mockResolvedValue(user);vi.spyOn(api,'fetchCategories').mockResolvedValue([]);vi.spyOn(api,'fetchStaffUsers').mockResolvedValue([]);
  vi.spyOn(api,'fetchStaffTickets').mockResolvedValue(empty);vi.spyOn(api,'fetchAdminUsers').mockResolvedValue([]);vi.spyOn(api,'fetchStaffDashboard').mockResolvedValue(dashboard);
  vi.spyOn(api,'fetchActions').mockResolvedValue({actions:[],workflowRevision:0});vi.spyOn(api,'fetchTicketComments').mockResolvedValue([]);vi.spyOn(api,'fetchInternalNotes').mockResolvedValue([]);
});
afterEach(()=>vi.restoreAllMocks());
async function open(role:api.User['role']='IT_STAFF'){
  vi.mocked(api.fetchCurrentUser).mockResolvedValue({...user,role});render(<App/>);
  await screen.findByRole('heading',{name:role==='ADMINISTRATOR'?'User Management':'IT Support Ticket Queue'});
  expect(api.fetchStaffDashboard).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Dashboard'}));
  await screen.findByRole('button',{name:'View My Assigned Tickets (3)'});expect(screen.getByRole('button',{name:'Dashboard'})).toHaveAttribute('aria-current','page');
}
const destinations=[{name:'View Unassigned Active Tickets (7)',filters:dashboard.drillDowns.unassignedActive.filters},{name:'View My Assigned Tickets (3)',filters:dashboard.drillDowns.myActive.filters},...statuses.map(s=>({name:`View ${statusLabels[s]} Tickets (${dashboard.counts.byStatus[s]})`,filters:dashboard.drillDowns.byStatus[s].filters})),...priorities.map(p=>({name:`View ${priorityLabels[p]} Priority Tickets (${dashboard.counts.byPriority[p]})`,filters:dashboard.drillDowns.byPriority[p].filters}))];
it.each(destinations)('applies $name to the real queue and normal navigation clears it',async({name,filters})=>{
  await open();fireEvent.click(screen.getByRole('button',{name}));await waitFor(()=>expect(api.fetchStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({...filters,page:1,sortBy:'updatedAt',sortOrder:'desc'})));
  expect(screen.getByLabelText('Status')).toHaveValue(filters.statusGroup?'ACTIVE':filters.currentStatus||'ALL');
  expect(screen.getByLabelText('Assignment')).toHaveValue(filters.assignedStaffId||'ALL');
  fireEvent.click(screen.getByRole('button',{name:/📥 Ticket Queue/}));await waitFor(()=>expect(api.fetchStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({statusGroup:undefined,currentStatus:undefined,assignedStaffId:undefined,page:1,sortBy:'createdAt'})));
});
it.each(['IT_STAFF','ADMINISTRATOR']as const)('preserves %s landing and opens recent Ticket and Action destinations',async role=>{
  vi.spyOn(api,'fetchStaffTicketDetail').mockResolvedValue({id:7,ticketNumber:'OPS-7',summary:'Printer issue',description:'Operational detail body',requestedPriority:'MEDIUM',itPriority:'HIGH',currentStatus:'OPEN',requesterId:2,categoryId:1,relatedSystemId:1,workflowRevision:0,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-10-16T11:00:00Z',attachments:[]}as any);
  await open(role);fireEvent.click(screen.getByRole('button',{name:'Open Ticket OPS-7'}));await screen.findByText('Operational detail body');expect(api.fetchStaffTicketDetail).toHaveBeenCalledWith(7);
  fireEvent.click(screen.getByRole('button',{name:'Dashboard'}));fireEvent.click(await screen.findByRole('button',{name:'Open Action 9 on Ticket OPS-7'}));
  await waitFor(()=>expect(screen.getByRole('heading',{name:'Actions Taken'})).toHaveFocus());expect(api.fetchActions).toHaveBeenCalledWith(7);
  if(role==='ADMINISTRATOR'){fireEvent.click(screen.getByRole('button',{name:/User Management/}));await screen.findByRole('heading',{name:'User Management'});}
});
