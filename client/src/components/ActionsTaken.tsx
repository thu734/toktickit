import { useCallback, useEffect, useRef, useState } from "react";
import { ActionTaken, fetchActions, User } from "../api";

export interface ActionsTakenProps {
  ticketId: number;
  ticketStatus: string;
  viewer?: Pick<User, "name" | "role">;
  onRefreshTicket?: () => Promise<void>;
}

export function actionError(error: unknown): string {
  const e = error as { status?: number; code?: string; message?: string };
  if (e.status === 401) return "Your session has expired. Please log in again.";
  if (e.code === "MUST_CHANGE_PASSWORD") return "Change your password before accessing Actions.";
  if (e.status === 403) return "You do not have permission to access these Actions.";
  if (e.status === 404) return "Ticket or Action not found.";
  return e.message || "Unable to load Actions. Please retry.";
}

export function ActionsTaken({ ticketId }: ActionsTakenProps) {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const data = await fetchActions(ticketId);
      if (request === generation.current) setActions(data.actions);
    } catch (e) {
      if (request === generation.current) setError(actionError(e));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [ticketId]);
  useEffect(() => { setActions([]); void load(); return () => { generation.current++; }; }, [load]);

  return <section className="card p-3 p-md-4 my-4" aria-label="Actions Taken" style={{ borderColor: "#E2E8F0" }}>
    <h2 className="h5" style={{ color: "#006B3C" }}>Actions Taken</h2>
    <p className="small text-muted">Shared with the Ticket Requester. Do not include private information.</p>
    {loading && <p role="status">Loading Actions…</p>}
    {error && <div role="alert" className="alert alert-danger">{error} <button type="button" className="btn btn-outline-success" onClick={() => void load()}>Retry Actions</button></div>}
    {!loading && !error && actions.length === 0 && <p>No Actions recorded.</p>}
    {!error && <ol className="list-unstyled mb-0">{actions.map(action => <li key={action.id}><ActionView action={action} /></li>)}</ol>}
  </section>;
}

export function ActionView({ action }: { action: ActionTaken }) {
  return <article className="border rounded p-3 mb-3" aria-label={`Action ${action.id}`} style={{ overflowWrap: "anywhere" }}>
    <h3 className="h6">Action {action.id} <span className="badge bg-secondary">{action.status}</span></h3>
    <dl className="mb-0">
      <dt>Created</dt><dd><time dateTime={action.createdAt}>{new Date(action.createdAt).toLocaleString()}</time></dd>
      <dt>Performed by</dt><dd>{action.performedBy.name}</dd>
      <dt>Assigned to</dt><dd>{action.assignedTo ? `${action.assignedTo.name}${action.assignedTo.isActive ? "" : " (inactive)"}` : "Unassigned"}</dd>
      <dt>Description</dt><dd style={{ whiteSpace: "pre-wrap" }}>{action.description}</dd>
      <dt>Result</dt><dd style={{ whiteSpace: "pre-wrap" }}>{action.result || "—"}</dd>
      <dt>Follow-Up Required</dt><dd>{action.followUpRequired ? "Yes" : "No"}</dd>
      {(action.followUpRequired || action.followUpNote) && <><dt>Follow-Up Note</dt><dd style={{ whiteSpace: "pre-wrap" }}>{action.followUpNote || "—"}</dd></>}
      <dt>Attachment Notes</dt><dd style={{ whiteSpace: "pre-wrap" }}>{action.attachmentNotes || "—"}</dd>
    </dl>
  </article>;
}
