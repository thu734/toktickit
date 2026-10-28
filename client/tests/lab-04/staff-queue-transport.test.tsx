import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StaffTicketQueue } from '../../src/components/StaffTicketQueue';

vi.hoisted(() => vi.stubEnv('VITE_API_URL', 'https://queue.example.test'));
afterEach(() => { vi.unstubAllGlobals(); });
const ticket = { id: 7, ticketNumber: 'TKT-2026-000007', summary: 'Verified Staff queue row', description: 'Queue transport regression',
  currentStatus: 'OPEN', requestedPriority: 'HIGH', itPriority: 'HIGH', workflowRevision: 0,
  createdAt: '2026-10-19T00:00:00Z', updatedAt: '2026-10-19T00:00:00Z',
  requester: { id: 1, name: 'Requester', email: 'requester@test.local' }, category: { id: 1, name: 'Hardware' },
  relatedSystem: { id: 1, name: 'System' }, assignedStaff: { id: 2, name: 'Staff' } };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

describe('Staff Queue through the real API transport', () => {
  it('uses the configured origin, GET and credentials, retaining filters and rendering the queue response', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => String(input).includes('/api/categories') ? json([{ id: 1, name: 'Hardware' }])
      : json({ data: [ticket], pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } }));
    vi.stubGlobal('fetch', fetch);
    render(<StaffTicketQueue initialFilters={{ statusGroup: 'active', assignedStaffId: 'me' }} />);
    await screen.findByRole('cell', { name: /Verified Staff queue row/ });
    const call = fetch.mock.calls.find(([url]) => String(url).includes('/api/staff/tickets'))!;
    const url = new URL(String(call[0]));
    expect(url.origin).toBe('https://queue.example.test');
    expect(url.pathname).toBe('/api/staff/tickets');
    expect(Object.fromEntries(url.searchParams)).toEqual({ statusGroup: 'active', assignedStaffId: 'me', sortBy: 'updatedAt', sortOrder: 'desc', page: '1', limit: '10' });
    // GET is credentialed and does not need a write-only CSRF header.
    expect(call[1]).toEqual({ method: 'GET', credentials: 'include' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('reports a failed query safely and recovers through the existing search action without losing input', async () => {
    let failed = true;
    const fetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input).includes('/api/categories')) return json([]);
      return failed ? json({ message: 'P2022: private database column details' }, 500)
        : json({ data: [ticket], pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } });
    });
    vi.stubGlobal('fetch', fetch);
    render(<StaffTicketQueue />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch staff ticket queue');
    expect(screen.queryByText(/P2022/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No IT support tickets in queue|No tickets match your filter/i)).not.toBeInTheDocument();
    const search = screen.getByPlaceholderText(/Ticket #, summary, or description/i);
    fireEvent.change(search, { target: { value: 'Verified Staff' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(fetch.mock.calls.filter(([url]) => String(url).includes('/api/staff/tickets'))).toHaveLength(2));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch staff ticket queue');
    failed = false;
    // Retry the exact same retained search, rather than changing filters to force an effect.
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByRole('cell', { name: /Verified Staff queue row/ });
    expect(search).toHaveValue('Verified Staff');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
