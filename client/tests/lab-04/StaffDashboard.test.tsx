import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { act,fireEvent,render,screen,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaffDashboard,statusLabels,priorityLabels } from '../../src/components/StaffDashboard';
import * as api from '../../src/api';
import { dashboard,statuses,priorities } from './staffDashboardFixture';
const user:api.User={id:1,name:'Staff',email:'staff@test.local',role:'IT_STAFF',isActive:true,mustChangePassword:false};
let auth:{user:api.User|null;loading:boolean};
vi.mock('../../src/context/AuthContext',()=>({useAuth:()=>auth}));
const callbacks=()=>({onNavigateTickets:vi.fn(),onOpenTicket:vi.fn()});
beforeEach(()=>{auth={user:{...user},loading:false};vi.spyOn(api,'fetchStaffDashboard').mockResolvedValue(dashboard);});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it.each(['IT_STAFF','ADMINISTRATOR']as const)('renders all required operational content for %s without optional account counts',async role=>{
  auth.user={...user,role};render(<StaffDashboard {...callbacks()}/>);
  await screen.findByRole('button',{name:'View My Assigned Tickets (3)'});
  expect(screen.getAllByRole('article')).toHaveLength(2);
  for(const article of screen.getAllByRole('article'))expect(article.parentElement).toHaveClass('col-12','col-md-6');
  expect(within(screen.getByRole('region',{name:'Tickets by Status'})).getAllByRole('button')).toHaveLength(8);
  expect(within(screen.getByRole('region',{name:'Tickets by IT Priority'})).getAllByRole('button')).toHaveLength(4);
  for(const label of ['Recently Updated Tickets','My Planned Actions'])expect(screen.getByRole('region',{name:label})).toHaveClass('col-12','col-lg-6');
  expect(screen.getByText(/Actions on this Ticket are read-only/)).toBeInTheDocument();
  expect(screen.queryByText(/Active summaries include|primary Ticket Owner|All operational Tickets/)).not.toBeInTheDocument();
  expect(screen.queryByText('Assigned to you · Up to 5, oldest first.')).not.toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Unassigned Active Tickets'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'My Assigned Tickets'})).toBeInTheDocument();
  const timestamp=document.querySelector(`time[datetime="${dashboard.asOf}"]`)!;
  const formatter=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
  expect(timestamp).toHaveTextContent(formatter.format(new Date(dashboard.asOf)));
  expect(timestamp).toHaveTextContent(formatter.formatToParts(new Date(dashboard.asOf)).find(part=>part.type==='timeZoneName')!.value);
  expect(screen.queryByText(/Times shown in your local timezone/)).not.toBeInTheDocument();
  expect(screen.queryByText(/User Accounts|Total Users|Active Users/)).not.toBeInTheDocument();
});
it('all fourteen count destinations and both preview kinds work; keyboard activates a count',async()=>{
  const props=callbacks();render(<StaffDashboard {...props}/>);const keyboard=userEvent.setup();
  const first=await screen.findByRole('button',{name:'View Unassigned Active Tickets (7)'});first.focus();await keyboard.keyboard('{Enter}');
  fireEvent.click(screen.getByRole('button',{name:'View My Assigned Tickets (3)'}));
  for(const s of statuses)fireEvent.click(screen.getByRole('button',{name:`View ${statusLabels[s]} Tickets (${dashboard.counts.byStatus[s]})`}));
  for(const p of priorities)fireEvent.click(screen.getByRole('button',{name:`View ${priorityLabels[p]} Priority Tickets (${dashboard.counts.byPriority[p]})`}));
  expect(props.onNavigateTickets.mock.calls).toEqual([dashboard.drillDowns.unassignedActive,dashboard.drillDowns.myActive,...statuses.map(s=>dashboard.drillDowns.byStatus[s]),...priorities.map(p=>dashboard.drillDowns.byPriority[p])].map(d=>[d.filters]));
  fireEvent.click(screen.getByRole('button',{name:'Open Ticket OPS-7'}));expect(props.onOpenTicket).toHaveBeenLastCalledWith(7);
  fireEvent.click(screen.getByRole('button',{name:'Open Action 9 on Ticket OPS-7'}));expect(props.onOpenTicket).toHaveBeenLastCalledWith(7,true);
  fireEvent.click(screen.getByRole('button',{name:'Ticket Queue'}));expect(props.onNavigateTickets).toHaveBeenLastCalledWith({});
  await keyboard.tab();expect(document.activeElement?.tagName).toBe('BUTTON');
});
it('separates loading from successful empty results with every zero destination available',async()=>{
  let finish!:(value:api.StaffDashboardResponse)=>void;vi.mocked(api.fetchStaffDashboard).mockReturnValueOnce(new Promise(resolve=>finish=resolve));
  render(<StaffDashboard {...callbacks()}/>);expect(screen.getByText('Loading the operational dashboard…')).toBeInTheDocument();expect(screen.queryByRole('article')).not.toBeInTheDocument();
  const empty=structuredClone(dashboard);empty.counts={unassignedActive:0,myActive:0,byStatus:Object.fromEntries(statuses.map(s=>[s,0])) as typeof empty.counts.byStatus,byPriority:{LOW:0,MEDIUM:0,HIGH:0,URGENT:0}};empty.recentTickets=[];empty.myActions=[];
  await act(async()=>finish(empty));expect(screen.getByText('No operational Tickets yet.')).toBeInTheDocument();expect(screen.getByText('No planned Actions assigned to you.')).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:/^View .*\(0\)$/})).toHaveLength(14);
});
it.each([{status:401,expected:'session has expired'},{status:403,expected:'permission'},{status:403,code:'MUST_CHANGE_PASSWORD',expected:'initial password'},{status:500,message:'SQL secret',expected:'Please retry'},{message:'network failure',expected:'Please retry'}])('fails safely and retries %j',async failure=>{
  vi.mocked(api.fetchStaffDashboard).mockRejectedValueOnce(failure);render(<StaffDashboard {...callbacks()}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent(failure.expected);expect(screen.queryByRole('article')).not.toBeInTheDocument();expect(screen.queryByText('SQL secret')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Retry dashboard'}));await screen.findByRole('button',{name:'View My Assigned Tickets (3)'});
});
it.each([{user:null,loading:false},{user:{...user,role:'REQUESTER' as const},loading:false},{user:{...user,mustChangePassword:true},loading:false},{user,loading:true}])('guards before fetching %j',async state=>{
  auth=state;render(<StaffDashboard {...callbacks()}/>);expect(api.fetchStaffDashboard).not.toHaveBeenCalled();
});
it('refresh clears old data and account changes abort/ignore old requests',async()=>{
  const props=callbacks();const view=render(<StaffDashboard {...props}/>);await screen.findByRole('button',{name:'View My Assigned Tickets (3)'});
  let finish!:(value:api.StaffDashboardResponse)=>void;vi.mocked(api.fetchStaffDashboard).mockReturnValueOnce(new Promise(resolve=>finish=resolve));
  fireEvent.click(screen.getByRole('button',{name:'Refresh dashboard'}));expect(screen.queryByRole('article')).not.toBeInTheDocument();
  const signal=vi.mocked(api.fetchStaffDashboard).mock.calls.at(-1)![0]!;
  auth={user:{...user,id:2},loading:false};view.rerender(<StaffDashboard {...props}/>);await screen.findByRole('button',{name:'View My Assigned Tickets (3)'});expect(signal.aborted).toBe(true);
  await act(async()=>finish({...dashboard,counts:{...dashboard.counts,myActive:999}}));expect(screen.queryByRole('button',{name:'View My Assigned Tickets (999)'})).not.toBeInTheDocument();
});
it('transport retains session credentials and forwards cancellation; non-JSON failures stay safe',async()=>{
  vi.mocked(api.fetchStaffDashboard).mockRestore();const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>dashboard}).mockResolvedValueOnce({ok:false,status:503,json:async()=>{throw Error('bad json')}});vi.stubGlobal('fetch',fetcher);
  const controller=new AbortController();expect(await api.fetchStaffDashboard(controller.signal)).toEqual(dashboard);expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/\/api\/dashboard\/staff$/),{credentials:'include',signal:controller.signal});
  await expect(api.fetchStaffDashboard()).rejects.toMatchObject({status:503,message:'Unable to retrieve the operational dashboard.'});
});
