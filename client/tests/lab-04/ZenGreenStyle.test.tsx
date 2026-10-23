import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionForm } from '../../src/components/ActionForm';
import { ActionsTaken } from '../../src/components/ActionsTaken';
import * as api from '../../src/api';

vi.mock('../../src/api', () => ({ fetchActions: vi.fn(), fetchStaffUsers: vi.fn(), createAction: vi.fn(), updateAction: vi.fn() }));
const completed: api.ActionTaken = {
  id: 10, ticketId: 7, performedById: 2, assignedToId: null, status: 'COMPLETED',
  description: 'Inspect workstation', result: 'Repaired', followUpRequired: false, followUpNote: null, attachmentNotes: 'diagnostic.pdf',
  createdAt: '2026-10-23T03:00:00Z', updatedAt: '2026-10-23T03:00:00Z',
  performedBy: { id: 2, name: 'Staff Creator', email: 'staff@example.test', role: 'IT_STAFF' }, assignedTo: null,
};
beforeEach(() => {
  vi.resetAllMocks(); vi.mocked(api.fetchStaffUsers).mockResolvedValue([]);
  vi.mocked(api.fetchActions).mockResolvedValue({ actions: [completed], workflowRevision: 1 });
});

describe('STYLE-01 component presentation semantics (rendered CSS verified in Playwright)', () => {
  it('associates conditional validation and moves focus without saving invalid input', async () => {
    const save = vi.fn(), keyboard = userEvent.setup();
    render(<ActionForm performer="Signed-in Staff" busy={false} blocked={false} onSave={save} onClose={vi.fn()} />);
    const form = screen.getByRole('form', { name: 'Create Action' });
    const description = within(form).getByRole('textbox', { name: 'Description' });
    expect(description).toHaveAttribute('aria-required', 'true');
    await keyboard.click(within(form).getByRole('button', { name: 'Create Action' }));
    expect(description).toHaveFocus(); expect(description).toHaveAttribute('aria-invalid', 'true');
    const message = within(form).getByRole('alert');
    expect(description).toHaveAccessibleDescription(message.textContent!);
    await keyboard.type(description, 'Inspect printer');
    await keyboard.click(within(form).getByLabelText('Follow-Up Required'));
    const followUp = within(form).getByRole('textbox', { name: 'Follow-Up Note' });
    expect(followUp).toHaveAttribute('aria-required', 'true');
    await keyboard.click(within(form).getByRole('button', { name: 'Create Action' }));
    expect(followUp).toHaveFocus(); expect(followUp).toHaveAccessibleDescription(/required when follow-up is selected/);
    expect(save).not.toHaveBeenCalled();
  });
  it('focuses the editable Result in completed correction and preserves immutable attribution', () => {
    render(<ActionForm original={completed} performer="Later editor" busy={false} blocked={false} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'Result' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Result' })).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText(/Performed by: Staff Creator/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Assigned to' })).not.toBeInTheDocument();
  });
  it('exposes Result requiredness when completion validation is requested', async () => {
    const keyboard = userEvent.setup(), save = vi.fn();
    render(<ActionForm original={{ ...completed, status: 'PLANNED', result: null }} performer="Staff" busy={false} blocked={false} onSave={save} onClose={vi.fn()} />);
    const result = screen.getByRole('textbox', { name: 'Result' });
    expect(result).toHaveAttribute('aria-required', 'false');
    await keyboard.click(screen.getByRole('button', { name: 'Complete Action' }));
    expect(result).toHaveAttribute('aria-required', 'true');
    expect(result).toHaveFocus(); expect(result).toHaveAttribute('aria-invalid', 'true');
    expect(save).not.toHaveBeenCalled();
  });
  it('announces saving and disables mutation controls', async () => {
    render(<ActionForm performer="Staff" busy blocked={false} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Saving Action…')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('textbox', { name: 'Description' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard draft' })).toBeDisabled();
    expect(await screen.findByText('No eligible assignees available. Unassigned is permitted.')).toBeInTheDocument();
  });
  it('retains real list semantics and explicit Requester read-only/non-color cues', async () => {
    render(<ActionsTaken ticketId={7} ticketStatus="OPEN" viewer={{ role: 'REQUESTER', name: 'Owner' }} />);
    const article = await screen.findByRole('article', { name: 'Action 10' });
    expect(screen.getByRole('list')).toContainElement(article);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Actions are read-only for Requesters.')).toBeInTheDocument();
    expect(within(article).getByRole('heading')).toHaveTextContent('COMPLETED');
    expect(within(article).getByText('No', { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Action|Edit Action|Correct completed/ })).not.toBeInTheDocument();
  });
  it('labels shared content and terminal-Ticket restrictions for Staff', async () => {
    render(<ActionsTaken ticketId={7} ticketStatus="RESOLVED" viewer={{ role: 'IT_STAFF', name: 'Staff' }} />);
    await screen.findByRole('article', { name: 'Action 10' });
    expect(screen.getByText(/shared with the Requester. Private information belongs in Internal Notes/)).toBeInTheDocument();
    expect(screen.getByText('Reopen this Ticket before adding or correcting Actions.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Action|Correct completed/ })).not.toBeInTheDocument();
  });
});
