import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequesterDashboard } from '../../src/components/RequesterDashboard';
import * as api from '../../src/api';

const owner:api.User={id:1,name:'Owner',email:'owner@test.local',role:'REQUESTER',isActive:true,mustChangePassword:false};
let auth:{user:api.User|null;loading:boolean};
vi.mock('../../src/context/AuthContext',()=>({useAuth:()=>auth}));
const payload:api.RequesterDashboardResponse={asOf:'2026-10-16T12:00:00Z',counts:{active:7,new:1,open:2,inProgress:1,waitingForRequester:2,resolved:3,reopened:1},
  recentTickets:[{id:7,ticketNumber:'TKT-7',summary:'Printer issue',currentStatus:'WAITING_FOR_REQUESTER',updatedAt:'2020-01-01T00:00:00Z'},
    {id:6,ticketNumber:'TKT-6',summary:'Network issue',currentStatus:'RESOLVED',updatedAt:'1990-01-01T00:00:00Z'}],
  drillDowns:{active:{destination:'my-tickets',filters:{statusGroup:'active'}},
    new:{destination:'my-tickets',filters:{currentStatus:'NEW'}},open:{destination:'my-tickets',filters:{currentStatus:'OPEN'}},
    inProgress:{destination:'my-tickets',filters:{currentStatus:'IN_PROGRESS'}},reopened:{destination:'my-tickets',filters:{currentStatus:'REOPENED'}},waitingForRequester:{destination:'my-tickets',filters:{currentStatus:'WAITING_FOR_REQUESTER'}},resolved:{destination:'my-tickets',filters:{currentStatus:'RESOLVED'}}}};
const props=()=>({onNavigateTickets:vi.fn(),onOpenTicket:vi.fn(),onNavigateCreate:vi.fn()});
beforeEach(()=>{auth={user:{...owner},loading:false};vi.spyOn(api,'fetchRequesterDashboard').mockResolvedValue(payload);});
afterEach(()=>vi.restoreAllMocks());

describe('REQ-UI-01 Requester Dashboard',()=>{
  it('renders correctly labelled metrics, bounded previews, status text, timestamps and responsive structure',async()=>{
    render(<RequesterDashboard {...props()}/>);
    expect(await screen.findByRole('heading',{name:'Requester Dashboard'})).toBeInTheDocument();
    for(const [label,count]of [['Open',2],['In Progress',1],['Waiting for Requester',2],['Resolved',3]]as const){
      const card=await screen.findByRole('article',{name:label});expect(within(card).getByText(String(count))).toBeInTheDocument();
      expect(card.parentElement).toHaveClass('col-12','col-md-6','col-xl-3');
    }
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByLabelText('Active Tickets summary')).toHaveTextContent('Active Tickets: 7');
    expect(screen.getByText('Includes New, Open, In Progress, Waiting for Requester, and Reopened.')).toBeInTheDocument();
    expect(screen.getByRole('group',{name:'Additional Ticket statuses'})).toHaveTextContent('New: 1');
    expect(screen.getByRole('group',{name:'Additional Ticket statuses'})).toHaveTextContent('Reopened: 1');
    const recent=screen.getByRole('region',{name:'Recent Tickets'});expect(within(recent).getAllByRole('listitem')).toHaveLength(2);
    expect(within(recent).getAllByRole('button').map(b=>b.textContent)).toEqual(['TKT-7','TKT-6']);
    expect(screen.getByText('WAITING FOR REQUESTER')).toBeInTheDocument();expect(screen.getByText(/Times shown in your local timezone/)).toBeInTheDocument();
    expect(document.querySelector('time[datetime="2026-10-16T12:00:00Z"]')).toBeInTheDocument();
    expect(document.querySelector('time[datetime="1990-01-01T00:00:00Z"]')).toBeInTheDocument();
    expect(screen.queryByText(/resolved this week/i)).not.toBeInTheDocument();
  });
  it('navigates all metric filters, ordinary My Tickets, Create Ticket and direct detail',async()=>{
    const callbacks=props();render(<RequesterDashboard {...callbacks}/>);
    fireEvent.click(await screen.findByRole('button',{name:'View All Active (7)'}));
    for(const name of ['View Open (2)','View In Progress (1)','View Waiting for Requester (2)','View Resolved (3)','View New (1)','View Reopened (1)']) fireEvent.click(screen.getByRole('button',{name}));
    expect(callbacks.onNavigateTickets.mock.calls).toEqual([[{statusGroup:'active'}],[{currentStatus:'OPEN'}],[{currentStatus:'IN_PROGRESS'}],[{currentStatus:'WAITING_FOR_REQUESTER'}],[{currentStatus:'RESOLVED'}],[{currentStatus:'NEW'}],[{currentStatus:'REOPENED'}]]);
    fireEvent.click(screen.getByRole('button',{name:'My Tickets'}));expect(callbacks.onNavigateTickets).toHaveBeenLastCalledWith({});
    fireEvent.click(screen.getByRole('button',{name:'Create Ticket'}));expect(callbacks.onNavigateCreate).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button',{name:'Open Ticket TKT-7'}));expect(callbacks.onOpenTicket).toHaveBeenCalledWith(7);
  });
  it('keeps loading distinct from valid zero results',async()=>{
    let finish!:(value:api.RequesterDashboardResponse)=>void;vi.mocked(api.fetchRequesterDashboard).mockReturnValueOnce(new Promise(resolve=>{finish=resolve}));
    render(<RequesterDashboard {...props()}/>);expect(screen.getByText('Loading your dashboard…')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    await act(async()=>finish({...payload,counts:{active:0,new:0,open:0,inProgress:0,waitingForRequester:0,resolved:0,reopened:0},recentTickets:[]}));
    expect(await screen.findByText(/No Tickets Yet/)).toBeInTheDocument();expect(screen.getAllByText('0')).toHaveLength(4);
    expect(screen.getByRole('button',{name:'View All Active (0)'})).toBeEnabled();
    expect(screen.getByRole('button',{name:'View New (0)'})).toHaveTextContent('New: 0');
    expect(screen.getByRole('button',{name:'View Reopened (0)'})).toHaveTextContent('Reopened: 0');
    expect(screen.getByRole('button',{name:'Create Ticket'})).toBeEnabled();
  });
  it.each([{status:500,message:'Dashboard unavailable',expected:'Dashboard unavailable'},{status:401,expected:'Your session has expired'},
    {status:403,expected:'You do not have permission'},{status:403,code:'MUST_CHANGE_PASSWORD',expected:'Change your initial password'},
    {message:'Network unavailable',expected:'Network unavailable'}])('distinguishes failure %j from zeros and supports retry',async failure=>{
    vi.mocked(api.fetchRequesterDashboard).mockRejectedValueOnce(failure);render(<RequesterDashboard {...props()}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent(failure.expected);expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByText(/No Tickets Yet/)).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Retry dashboard'}));
    expect(await screen.findByRole('button',{name:'View All Active (7)'})).toBeInTheDocument();expect(api.fetchRequesterDashboard).toHaveBeenCalledTimes(2);
  });
  it('does not show stale counts as success after refresh fails',async()=>{
    render(<RequesterDashboard {...props()}/>);await screen.findByRole('button',{name:'View All Active (7)'});
    vi.mocked(api.fetchRequesterDashboard).mockRejectedValueOnce(new Error('Refresh failed'));fireEvent.click(screen.getByRole('button',{name:'Refresh dashboard'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh failed');expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it.each(['IT_STAFF','ADMINISTRATOR']as const)('blocks %s without fetching',async role=>{
    auth.user={...owner,role};render(<RequesterDashboard {...props()}/>);expect(screen.getByRole('alert')).toHaveTextContent('do not have permission');expect(api.fetchRequesterDashboard).not.toHaveBeenCalled();
  });
  it.each(['anonymous','locked','loading'])('handles %s session before fetching',async state=>{
    if(state==='anonymous')auth.user=null;if(state==='locked')auth.user={...owner,mustChangePassword:true};if(state==='loading')auth.loading=true;
    render(<RequesterDashboard {...props()}/>);expect(screen.getByRole(state==='loading'?'status':'alert')).toBeInTheDocument();expect(api.fetchRequesterDashboard).not.toHaveBeenCalled();
  });
  it('discards a late old-owner response after an account change',async()=>{
    let finish!:(value:api.RequesterDashboardResponse)=>void;
    vi.mocked(api.fetchRequesterDashboard).mockReturnValueOnce(new Promise(resolve=>{finish=resolve}));
    const view=render(<RequesterDashboard {...props()}/>);const oldSignal=vi.mocked(api.fetchRequesterDashboard).mock.calls[0][0];
    auth.user={...owner,id:2};view.rerender(<RequesterDashboard {...props()}/>);await screen.findByText('Printer issue');expect(oldSignal?.aborted).toBe(true);
    await act(async()=>finish({...payload,recentTickets:[{...payload.recentTickets[0],summary:'OLD OWNER PRIVATE PREVIEW'}]}));
    expect(screen.queryByText('OLD OWNER PRIVATE PREVIEW')).not.toBeInTheDocument();expect(screen.getByText('Printer issue')).toBeInTheDocument();
  });
  it('removes data on logout and aborts an in-flight request on unmount',async()=>{
    const view=render(<RequesterDashboard {...props()}/>);await screen.findByText('Printer issue');auth.user=null;view.rerender(<RequesterDashboard {...props()}/>);
    expect(screen.queryByText('Printer issue')).not.toBeInTheDocument();expect(screen.getByRole('alert')).toHaveTextContent('Sign in');
    auth.user={...owner};vi.mocked(api.fetchRequesterDashboard).mockReturnValueOnce(new Promise(()=>{}));view.rerender(<RequesterDashboard {...props()}/>);
    const signal=vi.mocked(api.fetchRequesterDashboard).mock.calls.at(-1)![0];view.unmount();expect(signal?.aborted).toBe(true);
  });
  it('provides keyboard access to all seven drill-downs in layout order',async()=>{
    const callbacks=props();render(<RequesterDashboard {...callbacks}/>);
    const names=['View All Active (7)','View Open (2)','View In Progress (1)','View Waiting for Requester (2)','View Resolved (3)','View New (1)','View Reopened (1)'];
    const first=await screen.findByRole('button',{name:names[0]});first.focus();const keyboard=userEvent.setup();
    for(let i=0;i<names.length;i++){
      expect(screen.getByRole('button',{name:names[i]})).toHaveFocus();await keyboard.keyboard('{Enter}');
      if(i<names.length-1)await keyboard.tab();
    }
    expect(callbacks.onNavigateTickets.mock.calls).toEqual([[{statusGroup:'active'}],[{currentStatus:'OPEN'}],[{currentStatus:'IN_PROGRESS'}],[{currentStatus:'WAITING_FOR_REQUESTER'}],[{currentStatus:'RESOLVED'}],[{currentStatus:'NEW'}],[{currentStatus:'REOPENED'}]]);
  });
  it('renders long and markup-like summaries as safe text',async()=>{
    const summary='<script>private()</script> '+ 'long '.repeat(200);
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValueOnce({...payload,recentTickets:[{...payload.recentTickets[0],summary}]});
    render(<RequesterDashboard {...props()}/>);await screen.findByText((text,node)=>node?.tagName==='P'&&text.includes('<script>private()</script>'));
    expect(document.querySelector('script')).toBeNull();expect(screen.getByRole('listitem')).toHaveStyle({overflowWrap:'anywhere'});
  });
});
