import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StaffTicketDetail } from '../../src/components/StaffTicketDetail';
import { ActionsTaken } from '../../src/components/ActionsTaken';
import * as api from '../../src/api';

vi.mock('../../src/api', () => ({ fetchStaffTicketDetail: vi.fn(), assignStaffTicket: vi.fn(), updateStaffTicketPriority: vi.fn(), updateStaffTicketStatus: vi.fn(),
  fetchTicketComments: vi.fn(), postTicketComment: vi.fn(), fetchInternalNotes: vi.fn(), postInternalNote: vi.fn(), fetchStaffUsers: vi.fn(),
  fetchActions: vi.fn(), createAction: vi.fn(), updateAction: vi.fn(),
}));
const base = { id: 7, ticketNumber: 'WF-7', summary: 'Network issue', description: 'Test description', requestedPriority: 'MEDIUM', itPriority: 'HIGH', currentStatus: 'OPEN',
  workflowRevision: 4, assignedStaffId: null, assignedStaff: null, requester: { name: 'Requester' }, attachments: [] };
const action: api.ActionTaken = { id: 10, ticketId: 7, performedById: 2, assignedToId: null, status: 'PLANNED', description: 'Inspect network', result: null,
  followUpRequired: false, followUpNote: null, attachmentNotes: null, createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z',
  performedBy: { id: 2, name: 'Staff', email: 'staff@test.local', role: 'IT_STAFF' }, assignedTo: null };
let latest: typeof base;
let actions: api.ActionTaken[];
beforeEach(() => {
  vi.resetAllMocks(); latest = { ...base }; actions = [];
  vi.mocked(api.fetchStaffTicketDetail).mockImplementation(async () => ({ ...latest }));
  vi.mocked(api.fetchActions).mockImplementation(async () => ({ actions, workflowRevision: latest.workflowRevision }));
  vi.mocked(api.fetchStaffUsers).mockResolvedValue([]); vi.mocked(api.fetchTicketComments).mockResolvedValue([]); vi.mocked(api.fetchInternalNotes).mockResolvedValue([]);
});
async function open(role: 'IT_STAFF' | 'ADMINISTRATOR' | 'REQUESTER' = 'IT_STAFF') {
  render(<StaffTicketDetail ticketId={7} currentUserId={2} currentUserRole={role} currentUserName="Staff" />);
  await screen.findByText('WF-7');
  await waitFor(() => expect(screen.queryByText(/Checking current Actions/)).not.toBeInTheDocument());
}
function choose(target: string) { fireEvent.change(screen.getByLabelText('Update Status'), { target: { value: target } }); }
function resolve() { choose('RESOLVED'); fireEvent.change(screen.getByLabelText(/Resolution Summary/), { target: { value: 'Retain my summary' } }); fireEvent.click(screen.getByRole('button', { name: 'Save Transition to RESOLVED' })); }
const matrix: Record<string, string[]> = {
  NEW: ['OPEN','IN_PROGRESS','CANCELLED'], OPEN: ['IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CANCELLED'], IN_PROGRESS: ['WAITING_FOR_REQUESTER','RESOLVED','CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS','RESOLVED','CANCELLED'], RESOLVED: ['CLOSED','REOPENED'], CLOSED: ['REOPENED'], REOPENED: ['IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CANCELLED'], CANCELLED: [],
};
describe('WF-UI-01', () => {
  it.each(Object.keys(matrix))('offers only approved %s targets', async current => {
    latest.currentStatus = current; await open();
    if (current === 'CANCELLED') expect(screen.queryByLabelText('Update Status')).not.toBeInTheDocument();
    else expect(within(screen.getByLabelText('Update Status')).getAllByRole('option').map(o => (o as HTMLOptionElement).value)).toEqual([current, ...matrix[current]]);
  });
  it.each(['IT_STAFF','ADMINISTRATOR'] as const)('allows %s workflow operations with revisions and updates summary', async role => {
    vi.mocked(api.assignStaffTicket).mockImplementation(async () => { latest = { ...latest, workflowRevision: 5 }; return latest; });
    vi.mocked(api.updateStaffTicketPriority).mockImplementation(async () => { latest = { ...latest, workflowRevision: 6, itPriority: 'URGENT' }; return latest; });
    vi.mocked(api.updateStaffTicketStatus).mockImplementation(async () => { latest = { ...latest, workflowRevision: 7, currentStatus: 'RESOLVED' }; return latest; });
    await open(role);
    fireEvent.click(screen.getByRole('button', { name: 'Claim Ticket' }));
    await screen.findByText('Ticket claimed successfully.'); expect(api.assignStaffTicket).toHaveBeenCalledWith(7,2,4);
    fireEvent.change(screen.getByLabelText('IT Priority'), { target: { value: 'URGENT' } });
    await screen.findByText('IT Priority updated successfully.'); expect(api.updateStaffTicketPriority).toHaveBeenCalledWith(7,'URGENT',5);
    await waitFor(() => expect(screen.getByRole('option',{name:'RESOLVED'})).toBeEnabled());
    resolve(); await screen.findByText('Ticket status updated successfully.');
    expect(api.updateStaffTicketStatus).toHaveBeenCalledWith(7,'RESOLVED','Retain my summary',6);
    expect(screen.getByRole('option',{name:'RESOLVED (Current)'})).toBeInTheDocument();
    expect(screen.getByText(/Reopen this Ticket before adding/)).toBeInTheDocument();
  });
  it.each(['PLANNED','COMPLETED'] as const)('blocks resolution for %s outstanding work', async status => {
    actions = [{ ...action, status, followUpRequired: status === 'COMPLETED', followUpNote: 'Check' }]; await open();
    expect(screen.getByRole('option',{name:'RESOLVED'})).toBeDisabled();
    expect(screen.getByText(/Resolution and closure blocked:/)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Review Actions Taken'})).toHaveAttribute('href','#actions-heading-7');
    expect(api.updateStaffTicketStatus).not.toHaveBeenCalled();
  });
  it('rechecks closure feedback on resolved legacy tickets', async () => {
    latest.currentStatus = 'RESOLVED'; actions = [action]; await open();
    expect(screen.getByRole('option',{name:'CLOSED'})).toBeDisabled(); expect(screen.getByRole('option',{name:'REOPENED'})).toBeEnabled();
  });
  it.each([{values: []}, {values: [{ ...action, status: 'CANCELLED' as const, followUpRequired: true }]}, {values: [{ ...action, status: 'COMPLETED' as const, followUpRequired: false }]}])('permits resolution for nonblocking Actions $values', async ({values}) => {
    actions = values; await open(); expect(screen.getByRole('option',{name:'RESOLVED'})).toBeEnabled();
  });
  it('fails closed while Actions load or fail and offers retry', async () => {
    vi.mocked(api.fetchActions).mockRejectedValueOnce(new Error('Actions unavailable'));
    render(<StaffTicketDetail ticketId={7} currentUserRole="IT_STAFF" />);
    await screen.findByText('Actions unavailable'); expect(screen.getByRole('option',{name:'RESOLVED'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Retry loading Actions'}));
    await waitFor(() => expect(screen.getByRole('option',{name:'RESOLVED'})).toBeEnabled());
  });
  it.each(['STALE_REVISION','RESOLUTION_BLOCKED'])('handles server %s after UI allowed resolution, preserving draft and requiring review', async code => {
    vi.mocked(api.updateStaffTicketStatus).mockRejectedValueOnce({status:409,code,blockingWork:{planned:1,followUp:0}});
    await open(); resolve(); await screen.findByRole('button',{name:'Refresh and review Ticket'});
    expect(screen.getByLabelText(/Resolution Summary/)).toHaveValue('Retain my summary');
    expect(screen.getByRole('button',{name:'Save Transition to RESOLVED'})).toBeDisabled();
    latest.workflowRevision = 5; actions = [action];
    fireEvent.click(screen.getByRole('button',{name:'Refresh and review Ticket'}));
    const review = await screen.findByRole('button',{name:'I have reviewed the latest Ticket'});
    await waitFor(() => expect(review).toBeEnabled()); fireEvent.click(review);
    expect(screen.getByLabelText(/Resolution Summary/)).toHaveValue('Retain my summary');
    expect(screen.getByRole('option',{name:'RESOLVED'})).toBeDisabled(); expect(api.updateStaffTicketStatus).toHaveBeenCalledTimes(1);
  });
  it('retains workflow and comment drafts after refresh failure, then retries with current revision', async () => {
    vi.mocked(api.updateStaffTicketStatus).mockRejectedValueOnce({status:409,code:'STALE_REVISION'}).mockImplementationOnce(async () => ({...latest,currentStatus:'RESOLVED',workflowRevision:6}));
    await open(); const comment = screen.getByPlaceholderText(/public comment/i);
    fireEvent.change(comment,{target:{value:'Keep comment'}}); resolve();
    await screen.findByRole('button',{name:'Refresh and review Ticket'});
    vi.mocked(api.fetchStaffTicketDetail).mockRejectedValueOnce(new Error('Refresh offline'));
    fireEvent.click(screen.getByRole('button',{name:'Refresh and review Ticket'})); await screen.findByText('Refresh offline');
    latest.workflowRevision = 5;
    fireEvent.click(screen.getByRole('button',{name:'Refresh and review Ticket'}));
    const review = await screen.findByRole('button',{name:'I have reviewed the latest Ticket'}); await waitFor(()=>expect(review).toBeEnabled());fireEvent.click(review);
    expect(comment).toHaveValue('Keep comment'); expect(screen.getByLabelText(/Resolution Summary/)).toHaveValue('Retain my summary');
    fireEvent.click(screen.getByRole('button',{name:'Save Transition to RESOLVED'})); await screen.findByText('Ticket status updated successfully.');
    expect(api.updateStaffTicketStatus).toHaveBeenLastCalledWith(7,'RESOLVED','Retain my summary',5);
  });
  it('retains an Action draft when a workflow write changes the revision', async () => {
    vi.mocked(api.updateStaffTicketPriority).mockImplementation(async () => { latest = {...latest,workflowRevision:5,itPriority:'URGENT'};return latest; });
    await open(); fireEvent.click(screen.getByRole('button',{name:'Add Action'}));
    fireEvent.change(screen.getByLabelText('Description'),{target:{value:'Keep Action draft'}});
    fireEvent.change(screen.getByLabelText('IT Priority'),{target:{value:'URGENT'}});
    await screen.findByText('Ticket workflow changed. Your draft is retained. Refresh and review before saving again.');
    expect(screen.getByLabelText('Description')).toHaveValue('Keep Action draft'); expect(screen.getByRole('button',{name:'Create Action'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Refresh and review'}));
    const review = await screen.findByRole('button',{name:'I have reviewed the latest Actions'});await waitFor(()=>expect(review).toBeEnabled());fireEvent.click(review);
    expect(screen.getByLabelText('Description')).toHaveValue('Keep Action draft');expect(screen.getByRole('button',{name:'Create Action'})).toBeEnabled();
  });
  it('refreshes ticket revision and resolution availability after a completed follow-up correction', async () => {
    actions = [{...action,status:'COMPLETED',result:'Fixed',followUpRequired:true,followUpNote:'Check'}];
    vi.mocked(api.updateAction).mockImplementation(async () => { latest.workflowRevision=5; actions=[{...actions[0],followUpRequired:false}];return {action:actions[0],workflowRevision:5}; });
    await open(); fireEvent.click(screen.getByRole('button',{name:'Correct completed Action'}));fireEvent.click(screen.getByLabelText('Follow-Up Required'));fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
    await waitFor(()=>expect(screen.getByRole('option',{name:'RESOLVED'})).toBeEnabled());
    resolve(); await waitFor(()=>expect(api.updateStaffTicketStatus).toHaveBeenCalledWith(7,'RESOLVED','Retain my summary',5));
  });
  it('prevents duplicate submissions while saving', async () => {
    let finish!: (value: any)=>void;vi.mocked(api.updateStaffTicketStatus).mockReturnValueOnce(new Promise(resolve=>{finish=resolve}));
    await open();choose('IN_PROGRESS'); const save=screen.getByRole('button',{name:'Save Transition to IN PROGRESS'});fireEvent.click(save);fireEvent.click(save);
    expect(api.updateStaffTicketStatus).toHaveBeenCalledTimes(1);expect(screen.getByLabelText('IT Priority')).toBeDisabled();
    await act(async()=>finish({...latest,currentStatus:'IN_PROGRESS',workflowRevision:5}));
  });
  it.each([{status:401,message:'Your session has expired.'},{status:403,message:'You do not have permission'}, {status:403,code:'MUST_CHANGE_PASSWORD',message:'Change your password'}, {status:404,message:'This Ticket is unavailable.'}, {status:400,message:'Invalid selection'}])('shows workflow failure %j', async failure => {
    vi.mocked(api.updateStaffTicketStatus).mockRejectedValueOnce(failure);await open();choose('IN_PROGRESS');fireEvent.click(screen.getByRole('button',{name:'Save Transition to IN PROGRESS'}));
    await screen.findByText(new RegExp(failure.message.replace('.','\\.')));
  });
  it('keeps Requester Actions read-only', async () => {
    render(<ActionsTaken ticketId={7} ticketStatus="OPEN" viewer={{name:'Requester',role:'REQUESTER'}} />);
    await screen.findByText('No Actions Taken yet.');expect(screen.queryByRole('button',{name:'Add Action'})).not.toBeInTheDocument();
  });
});
