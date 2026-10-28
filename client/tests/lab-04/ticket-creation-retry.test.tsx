import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreateTicketForm } from '../../src/components/CreateTicketForm';
import { RequesterProvider } from '../../src/context/RequesterContext';
import * as api from '../../src/api';
const requester = { id: 1, name: 'Requester', email: 'requester@test.local', department: 'IT' };
beforeEach(() => {
  vi.spyOn(api, 'fetchCategories').mockResolvedValue([{ id: 1, name: 'Hardware' }]);
  vi.spyOn(api, 'fetchRelatedSystems').mockResolvedValue([{ id: 1, name: 'System' }]);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function form() {
  render(<RequesterProvider initialRequester={requester}><CreateTicketForm /></RequesterProvider>);
  await waitFor(() => expect(screen.getByLabelText(/Category/i)).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: 'Preserve one operation' } });
  fireEvent.change(screen.getByLabelText(/Detailed Description/i), { target: { value: 'Preserve the draft after a lost response' } });
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: /Submit Ticket/i }));

describe('Ticket create operation identity', () => {
  it('reuses the key after an uncertain response, retains input, and rotates only for an intentional new submission', async () => {
    const create = vi.spyOn(api, 'createTicket').mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({ id: 9, ticketNumber: 'TKT-2026-000009' } as api.Ticket);
    await form(); submit();
    await screen.findByText(/Connection lost/);
    expect(screen.getByLabelText(/Ticket Summary/i)).toHaveValue('Preserve one operation');
    expect(screen.getByLabelText(/Detailed Description/i)).toHaveValue('Preserve the draft after a lost response');
    submit(); await screen.findByText(/Ticket Created Successfully/i);
    expect(create).toHaveBeenCalledTimes(2);
    const firstKey = create.mock.calls[0][2];
    expect(firstKey).toMatch(/^[a-f0-9-]{36}$/);
    expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
    fireEvent.click(screen.getByRole('button', { name: /Create Another Ticket/i }));
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: 'Preserve one operation' } });
    fireEvent.change(screen.getByLabelText(/Detailed Description/i), { target: { value: 'Preserve the draft after a lost response' } });
    submit(); await screen.findByText(/Ticket Created Successfully/i);
    expect(create.mock.calls[2][2]).not.toBe(firstKey);
  });
  it('retains the operation key and edited draft on a payload conflict', async () => {
    const create = vi.spyOn(api, 'createTicket').mockRejectedValueOnce(new Error('Connection lost'))
      .mockRejectedValueOnce(Object.assign(new Error('Retry the original details'), { status: 409 }));
    await form(); submit(); await screen.findByText(/Connection lost/);
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: 'Edited after uncertainty' } });
    submit(); await screen.findByText(/Retry the original details/);
    expect(screen.getByLabelText(/Ticket Summary/i)).toHaveValue('Edited after uncertainty');
    expect(create.mock.calls[1][2]).toBe(create.mock.calls[0][2]);
    expect(screen.getByRole('button', { name: /Submit Ticket/i })).not.toBeDisabled();
  });
  it('sends the supplied operation key only on the Ticket create request', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 9 }) });
    vi.stubGlobal('fetch', fetch);
    const payload = { categoryId: 1, relatedSystemId: 1, requestedPriority: 'MEDIUM' as const, summary: 'Ticket summary', description: 'Ticket description' };
    const key = crypto.randomUUID();
    await api.createTicket(payload, requester.id, key);
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/tickets$/), expect.objectContaining({
      method: 'POST', credentials: 'include', headers: expect.objectContaining({ 'Idempotency-Key': key }), body: JSON.stringify(payload),
    }));
  });
});
