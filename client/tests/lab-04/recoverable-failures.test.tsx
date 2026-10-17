import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../src/context/AuthContext';
import { RequesterProvider } from '../../src/context/RequesterContext';
import { AppShell } from '../../src/components/AppShell';
import { StaffTicketDetail } from '../../src/components/StaffTicketDetail';
import { RequesterTicketDetail } from '../../src/components/RequesterTicketDetail';
import { RequesterDashboard } from '../../src/components/RequesterDashboard';
import { ActionsTaken } from '../../src/components/ActionsTaken';
import * as api from '../../src/api';
vi.hoisted(() => { vi.stubEnv('VITE_API_URL', 'https://api.example.test'); });
vi.mock('../../src/api', async importOriginal => ({
  ...await importOriginal<typeof api>(),
  fetchCurrentUser: vi.fn(), logoutApi: vi.fn(), fetchStaffTicketDetail: vi.fn(), fetchTicketDetail: vi.fn(),
  fetchTicketComments: vi.fn(), fetchInternalNotes: vi.fn(), fetchStaffUsers: vi.fn(), fetchActions: vi.fn(),
  fetchRequesterDashboard: vi.fn(), postTicketComment: vi.fn(), postInternalNote: vi.fn(),
}));
const user = { id: 1, name: 'Issue 25 requester', email: 'requester@test.local', role: 'REQUESTER' as const, mustChangePassword: false, isActive: true };
const ticket = { id: 7, ticketNumber: 'TKT-25', summary: 'Retain drafts', description: 'An isolated fixture', currentStatus: 'OPEN', workflowRevision: 0,
  requestedPriority: 'LOW', itPriority: 'LOW', createdAt: '2026-01-01', updatedAt: '2026-01-01',
  requester: user, category: { name: 'Hardware' }, relatedSystem: { name: 'Test' }, attachments: [{id:9,filename:'file.pdf',fileSize:10,isRemoved:false}] };
const staffDetail = () => render(<StaffTicketDetail ticketId={7} currentUserRole="IT_STAFF" currentUserId={2} />);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.fetchCurrentUser).mockResolvedValue(user);
  vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue(ticket);
  vi.mocked(api.fetchTicketDetail).mockResolvedValue(ticket as any);
  vi.mocked(api.fetchTicketComments).mockResolvedValue([]);
  vi.mocked(api.fetchInternalNotes).mockResolvedValue([]);
  vi.mocked(api.fetchStaffUsers).mockResolvedValue([]);
  vi.mocked(api.fetchActions).mockResolvedValue({ actions: [], workflowRevision: 0 });
});
describe('Issue 25 recoverable failures', () => {
  it('reports failed logout, retains the session view, and permits explicit retry', async () => {
    vi.mocked(api.logoutApi).mockRejectedValueOnce(new Error('SQL password=secret')).mockResolvedValue(undefined);
    render(<AuthProvider><AppShell currentTab="my-tickets" onTabChange={() => {}}>Workspace</AppShell></AuthProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /user profile menu/i }));
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to sign out/i);
    expect(screen.queryByText(/SQL password/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /user profile menu/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry sign out/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /user profile menu/i })).not.toBeInTheDocument());
    expect(api.logoutApi).toHaveBeenCalledTimes(2);
  });
  it.each(['comments', 'notes'])('shows failed Staff %s as a retryable failure and retains the draft', async feed => {
    const read = feed === 'comments' ? vi.mocked(api.fetchTicketComments) : vi.mocked(api.fetchInternalNotes);
    read.mockRejectedValueOnce(new Error('SQL password=secret'));
    staffDetail(); await screen.findByText('Retain drafts');
    if (feed === 'notes') fireEvent.click(screen.getByRole('button', { name: /internal notes/i }));
    const input = screen.getByPlaceholderText(feed === 'comments' ? /write a public comment/i : /write private internal note/i);
    fireEvent.change(input, { target: { value: 'Keep this draft' } });
    const retry = await screen.findByRole('button', { name: feed === 'comments' ? /retry public comments/i : /retry internal notes/i });
    expect(screen.queryByText(/SQL password|No public comments yet|No private internal notes recorded/i)).not.toBeInTheDocument();
    fireEvent.click(retry);
    await screen.findByText(feed === 'comments' ? /No public comments yet/i : /No private internal notes recorded/i);
    expect(input).toHaveValue('Keep this draft');
  });
  it('shows Requester comment-load failure and retries without losing the comment draft', async () => {
    vi.mocked(api.fetchTicketComments).mockRejectedValueOnce(new Error('SQL password=secret'));
    render(<RequesterProvider initialRequester={{...user,department:'Test'}}><RequesterTicketDetail ticketId={7} onBack={() => {}} /></RequesterProvider>);
    await screen.findByText('Retain drafts');
    const input = screen.getByPlaceholderText(/Type your comment here/i);
    fireEvent.change(input, { target: { value: 'Keep requester draft' } });
    expect(screen.queryByText(/No public comments posted yet|SQL password/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /retry public comments/i }));
    await screen.findByText(/No public comments posted yet/i); expect(input).toHaveValue('Keep requester draft');
  });
  it('uses the configured API origin for Staff attachment downloads', async () => {
    staffDetail(); await screen.findByText('Retain drafts');
    fireEvent.click(screen.getByRole('button', { name: /attachments/i }));
    expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute('href', 'https://api.example.test/api/attachments/9/download');
  });
  it('does not render sensitive Action read failure text', async () => {
    vi.mocked(api.fetchActions).mockRejectedValueOnce({status:500,message:'SQL password=secret'});
    render(<ActionsTaken ticketId={7} ticketStatus="OPEN" />);
    expect(await screen.findByRole('alert')).not.toHaveTextContent(/SQL|secret/);
  });
  it('does not render sensitive Requester dashboard failure text', async () => {
    vi.mocked(api.fetchRequesterDashboard).mockRejectedValueOnce({status:500,message:'SQL password=secret'});
    render(<AuthProvider><RequesterDashboard onNavigateTickets={() => {}} onOpenTicket={() => {}} onNavigateCreate={() => {}} /></AuthProvider>);
    expect(await screen.findByRole('alert')).not.toHaveTextContent(/SQL|secret/);
  });
});

it.each(['comments', 'notes'])('retains a Staff %s submission draft after a recoverable failure', async feed => {
  const submit = feed === 'comments' ? vi.mocked(api.postTicketComment) : vi.mocked(api.postInternalNote);
  submit.mockRejectedValueOnce({ status: 500, message: 'SQL password=secret' });
  staffDetail(); await screen.findByText('Retain drafts');
  if (feed === 'notes') fireEvent.click(screen.getByRole('button', { name: /internal notes/i }));
  const input = screen.getByPlaceholderText(feed === 'comments' ? /write a public comment/i : /write private internal note/i);
  fireEvent.change(input, { target: { value: 'Retain my submission' } });
  fireEvent.click(screen.getByRole('button', { name: feed === 'comments' ? /post comment/i : /add note/i }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  await screen.findByText(feed === 'comments' ? /Failed to post public comment/i : /Failed to post internal note/i);
  expect(input).toHaveValue('Retain my submission'); expect(screen.queryByText(/SQL password/)).not.toBeInTheDocument();
});
