import { safeFailure } from "../utils/safeFailure";
import { useEffect, useRef, useState } from 'react';
import { createAction, fetchActions, updateAction } from '../api';
import type { ActionChanges, ActionFields, ActionTaken, ActionsResponse } from '../api';
import { ActionForm } from './ActionForm';
import './ActionsTaken.css';

export interface ActionsTakenProps {
  ticketId: number;
  ticketStatus: string;
  viewer?: { name: string; role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' };
  onRefreshTicket?: () => Promise<void>;
  workflowRevision?: number;
  refreshKey?: number;
  onWorkflowState?: (state: ActionsResponse | null) => void;
}

type Failure = { status?: number; code?: string; message?: string };
function failureMessage(error: unknown): string {
  const failure = error as Failure;
  if (failure?.status === 401) return 'Your session has expired. Sign in again.';
  if (failure?.code === 'MUST_CHANGE_PASSWORD') return 'Change your password before accessing Actions.';
  if (failure?.status === 403) return 'You do not have permission to access or change these Actions.';
  if (failure?.status === 404) return 'This Ticket or Action is unavailable.';
  return safeFailure(error, 'Unable to load or save Actions. Please retry.');
}

export default function ActionsTaken(props: ActionsTakenProps) {
  // Viewer comes from the existing authenticated application shell. The API
  // remains authoritative for session identity, ownership and current role.
  return <ActionsPanel key={`${props.ticketId}-${props.viewer?.role}`} {...props} performerName={props.viewer?.name || 'Authenticated user'}
    canWrite={props.viewer?.role === 'IT_STAFF' || props.viewer?.role === 'ADMINISTRATOR'} />;
}

function ActionsPanel({ ticketId, ticketStatus, onRefreshTicket, workflowRevision, refreshKey, onWorkflowState, performerName, canWrite }: ActionsTakenProps & { performerName: string; canWrite: boolean }) {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState('');
  const [editing, setEditing] = useState<ActionTaken | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conflict, setConflict] = useState<'refresh' | 'review' | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const createAttempt = useRef<(ActionFields & { workflowRevision: number; requestKey: string }) | null>(null);
  const saving = useRef(false);
  const mounted = useRef(true);
  const readSequence = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const terminal = ['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticketStatus);
  const writable = canWrite && !terminal;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function loadActions(refreshTicket = false) {
    const sequence = ++readSequence.current;
    setLoading(true); setReadError(''); onWorkflowState?.(null);
    try {
      if (refreshTicket) await onRefreshTicket?.();
      const response = await fetchActions(ticketId);
      if (!mounted.current || sequence !== readSequence.current) return false;
      setActions(response.actions); setRevision(response.workflowRevision); onWorkflowState?.(response);
      return true;
    } catch (failure) {
      if (mounted.current && sequence === readSequence.current) setReadError(failureMessage(failure));
      return false;
    } finally { if (mounted.current && sequence === readSequence.current) setLoading(false); }
  }
  useEffect(() => { void loadActions(); }, [ticketId, canWrite]);
  const observedWorkflow = useRef({ workflowRevision, refreshKey });
  useEffect(() => {
    const previous = observedWorkflow.current;
    observedWorkflow.current = { workflowRevision, refreshKey };
    if (previous.workflowRevision === workflowRevision && previous.refreshKey === refreshKey) return;
    if (editing && !uncertain && workflowRevision !== revision) {
      setConflict('refresh');
      setError('Ticket workflow changed. Your draft is retained. Refresh and review before saving again.');
    }
    void loadActions();
  }, [workflowRevision, refreshKey]);


  async function refreshConflict() {
    if (await loadActions(true)) { setConflict('review'); setError(''); }
  }
  function begin(action: ActionTaken | 'new') {
    setEditing(action); setError(''); setSuccess(''); setConflict(null); setUncertain(false); createAttempt.current = null;
  }
  async function save(fields: ActionFields | ActionChanges, retry = false) {
    if (saving.current || (retry ? !canWrite : !writable) || revision === null || conflict || loading || (!retry && uncertain)) return;
    if (editing !== 'new' && Object.keys(fields).length === 0) { setError('No changes to save.'); return; }
    saving.current = true; setBusy(true); setError(''); setSuccess('');
    try {
      if (editing === 'new') {
        if (!createAttempt.current) createAttempt.current = { ...fields as ActionFields, workflowRevision: revision, requestKey: crypto.randomUUID() };
        await createAction(ticketId, createAttempt.current);
      } else if (editing) {
        await updateAction(ticketId, editing.id, { ...fields, workflowRevision: revision });
      } else return;
      if (!mounted.current) return;
      createAttempt.current = null; setUncertain(false); setEditing(null); setConflict(null);
      setSuccess('Action saved.'); heading.current?.focus();
      // Replays return the original revision; always retrieve current authoritative state.
      await loadActions(true);
    } catch (failure) {
      if (!mounted.current) return;
      const details = failure as Failure;
      if (details?.status === 409) {
        setConflict('refresh'); setUncertain(false); createAttempt.current = null;
        setError('Newer work or a conflicting request exists. Your draft is retained. Refresh and review before saving again.');
      } else {
        if (editing !== 'new' && (!details?.status || details.status >= 500)) setConflict('refresh');
        const ambiguous = editing === 'new' && (!details?.status || details.status >= 500);
        setUncertain(ambiguous);
        if (!ambiguous) createAttempt.current = null;
        setError(ambiguous ? 'The create outcome is uncertain. Your draft is retained and locked. Retry the same request to safely confirm whether it was saved.' : failureMessage(failure));
      }
    } finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  const latestEditing = editing && editing !== 'new' ? actions.find(action => action.id === editing.id) : undefined;
  const changedLifecycle = editing && editing !== 'new' && latestEditing?.status !== editing.status;
  const ordered = [...actions].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id);

  return <section className="actions-taken card p-3 mt-3" aria-labelledby={`actions-heading-${ticketId}`}>
    <h2 id={`actions-heading-${ticketId}`} ref={heading} tabIndex={-1} className="h4">Actions Taken</h2>
    {canWrite && <p className="text-muted small">Actions Taken are shared with the Requester. Private information belongs in Internal Notes.</p>}
    {terminal && <p>{ticketStatus === 'CANCELLED' ? 'This Ticket is cancelled. Actions are read-only.' : 'Reopen this Ticket before adding or correcting Actions.'}</p>}
    {loading && <p role="status">{revision === null ? 'Loading Actions…' : 'Refreshing Actions…'}</p>}
    {readError && <div role="alert">{readError} <button className="btn btn-outline-secondary" disabled={loading || busy} onClick={() => void loadActions()}>Retry loading Actions</button></div>}
    {success && <p role="status">{success}</p>}
    {error && <p role="alert">{error}</p>}
    {conflict === 'refresh' && <button className="btn btn-outline-success" disabled={loading || busy} onClick={() => void refreshConflict()}>Refresh and review</button>}
    {conflict === 'review' && <div role="status"><p>Latest Actions loaded below. Review them against your retained draft. Nothing has been resubmitted.</p>
      <button className="btn btn-outline-success" disabled={loading || !!readError || !!changedLifecycle || !writable} onClick={() => setConflict(null)}>I have reviewed the latest Actions</button></div>}
    {changedLifecycle && <p role="alert">This Action's status changed. Your draft is retained for reference; discard it and open the current Action to continue.</p>}
    {uncertain && <button className="btn btn-outline-success" disabled={busy || !canWrite || loading} onClick={() => void save(createAttempt.current!, true)}>Retry same create request</button>}
    {!loading && !readError && revision !== null && actions.length === 0 && <p>No Actions Taken yet.</p>}
    <ol className="action-list">
      {ordered.map(action => <li key={action.id} className="action-item" role="article" aria-label={`Action ${action.id}`}>
        <h3 className="h5">Action #{action.id} — {action.status}</h3>
        <dl><dt>Action Date/Time</dt><dd><time dateTime={action.createdAt}>{new Date(action.createdAt).toLocaleString()}</time></dd>
          <dt>Action Description</dt><dd>{action.description}</dd><dt>Result</dt><dd>{action.result || 'Not recorded'}</dd>
          <dt>Performed by</dt><dd>{action.performedBy.name}</dd><dt>Assigned to</dt><dd>{action.assignedTo ? `${action.assignedTo.name}${action.assignedTo.isActive ? '' : ' (inactive)'}` : 'Unassigned'}</dd>
          <dt>Follow-Up Required</dt><dd>{action.followUpRequired ? 'Yes' : 'No'}</dd>
          {(action.followUpRequired || action.followUpNote) && <><dt>Follow-up Note</dt><dd>{action.followUpNote || 'Not recorded'}</dd></>}
          <dt>Attachment Notes</dt><dd>{action.attachmentNotes || 'None'}</dd></dl>
        {writable && action.status !== 'CANCELLED' && <button className="btn btn-outline-success" disabled={!!editing || busy || loading || !!readError} onClick={() => begin(action)}>{action.status === 'COMPLETED' ? 'Correct completed Action' : 'Edit Action'}</button>}
        {action.status === 'CANCELLED' && <p>Cancelled Actions cannot be edited.</p>}
      </li>)}
    </ol>
    {writable && !editing && <button className="btn btn-success" disabled={loading || revision === null || !!readError} onClick={() => begin('new')}>Add Action</button>}
    {editing && <ActionForm key={editing === 'new' ? 'new' : editing.id} original={editing === 'new' ? undefined : editing} performer={performerName}
      busy={busy} blocked={!writable || loading || !!readError || !!conflict || !!changedLifecycle || uncertain} lockDiscard={uncertain}
      onSave={fields => void save(fields)} onClose={() => { setEditing(null); setError(''); setConflict(null); heading.current?.focus(); }} />}
  </section>;
}

export { ActionsTaken };
