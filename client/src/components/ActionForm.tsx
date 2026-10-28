import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { ActionChanges, ActionFields, ActionTaken, fetchStaffUsers, StaffUser } from "../api";

export type ActionDraft = Required<ActionFields>;
export function draftFor(action?: ActionTaken): ActionDraft {
  return { description: action?.description || "", result: action?.result || "", assignedToId: action?.assignedToId ?? null,
    followUpRequired: action?.followUpRequired ?? false, followUpNote: action?.followUpNote || "", attachmentNotes: action?.attachmentNotes || "" };
}
export function validateDraft(draft: ActionDraft, terminal: boolean) {
  const errors: Partial<Record<keyof ActionDraft, string>> = {};
  if (!draft.description.trim() || draft.description.trim().length > 2000) errors.description = "Description is required and must be at most 2000 characters.";
  if (draft.result.trim().length > 2000 || (terminal && !draft.result.trim())) errors.result = "Result must be at most 2000 characters and is required for completion or cancellation.";
  if (draft.followUpNote.trim().length > 1000 || (draft.followUpRequired && !draft.followUpNote.trim())) errors.followUpNote = "Follow-Up Note must be at most 1000 characters and is required when follow-up is selected.";
  if (draft.attachmentNotes.trim().length > 1000) errors.attachmentNotes = "Attachment Notes must be at most 1000 characters.";
  return errors;
}
export function changedFields(draft: ActionDraft, original?: ActionTaken): ActionChanges {
  const changes: ActionChanges = {};
  const before = draftFor(original);
  for (const key of Object.keys(draft) as (keyof ActionDraft)[]) {
    if (original?.status === "COMPLETED" && ["description", "assignedToId"].includes(key)) continue;
    const value = typeof draft[key] === "string" ? (draft[key] as string).trim() : draft[key];
    if (!original || value !== before[key]) Object.assign(changes, { [key]: value });
  }
  return changes;
}

interface Props {
  original?: ActionTaken;
  performer: string;
  busy: boolean;
  blocked: boolean;
  lockDiscard?: boolean;
  onSave: (fields: ActionChanges, draft: ActionDraft) => void;
  onClose: () => void;
}
export function ActionForm({ original, performer, busy, blocked, lockDiscard, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(() => draftFor(original));
  const [terminalAttempt, setTerminalAttempt] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validateDraft>>({});
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffState, setStaffState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const prefix = useId();
  const completed = original?.status === "COMPLETED";
  useEffect(() => {
    if (completed) return;
    let active = true;
    setStaffState("loading");
    fetchStaffUsers({ strict: true }).then(users => { if (active) { setStaff(users); setStaffState("ready"); } })
      .catch(() => { if (active) setStaffState("error"); });
    return () => { active = false; };
  }, [attempt, completed]);
  useEffect(() => { form.current?.querySelector<HTMLTextAreaElement>("textarea:not([disabled]):not([readonly])")?.focus(); }, []);
  const submit = (event: FormEvent, status?: "COMPLETED" | "CANCELLED") => {
    event.preventDefault();
    if (busy || blocked) return;
    setTerminalAttempt(completed || !!status);
    const validation = validateDraft(draft, completed || !!status);
    setErrors(validation);
    const first = Object.keys(validation)[0];
    if (first) { document.getElementById(`${prefix}-${first}`)?.focus(); return; }
    const changes = changedFields(draft, original);
    if (status) changes.status = status;
    onSave(changes, draft);
  };
  const text = (key: "description" | "result" | "followUpNote" | "attachmentNotes", label: string, readOnly = false) => <div className="mb-3">
    <label className="form-label" htmlFor={`${prefix}-${key}`}>{label}</label>{(key === "description" || (key === "result" && (completed || terminalAttempt)) || (key === "followUpNote" && draft.followUpRequired)) && <span className="text-danger" aria-hidden="true"> *</span>}
    <textarea id={`${prefix}-${key}`} className={`form-control${errors[key] ? " is-invalid" : ""}`} rows={3} value={draft[key]} readOnly={readOnly}
      aria-required={key === "description" || (key === "result" && (completed || terminalAttempt)) || (key === "followUpNote" && draft.followUpRequired)}
      aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${prefix}-${key}-error` : undefined}
      onChange={e => setDraft({ ...draft, [key]: e.target.value })} />
    {errors[key] && <p id={`${prefix}-${key}-error`} className="text-danger" role="alert">{errors[key]}</p>}
  </div>;
  return <form ref={form} aria-label={original ? "Edit Action" : "Create Action"} onSubmit={submit} className="border rounded p-3 my-3" noValidate>
    <h3 className="h6">{completed ? "Correct completed Action" : original ? "Edit Action" : "Create Action"}</h3>
    <p>Performed by: {original?.performedBy.name || performer}<br />Created: {original ? new Date(original.createdAt).toLocaleString() : "Assigned automatically when saved"}</p>
    <p className="small text-muted">Description is required. Result is required to complete or cancel an Action. Follow-Up Note is required when follow-up is selected.</p>
    {busy && <p role="status">Saving Action…</p>}
    <fieldset disabled={busy || blocked}>
      {text("description", "Description", completed)}
      {text("result", "Result")}
      {!completed && <div className="mb-3">
        <label htmlFor={`${prefix}-assignedToId`} className="form-label">Assigned to</label>
        <select id={`${prefix}-assignedToId`} className="form-select" value={draft.assignedToId ?? ""} disabled={staffState !== "ready"}
          onChange={e => setDraft({ ...draft, assignedToId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Unassigned</option>
          {draft.assignedToId !== null && !staff.some(s => s.id === draft.assignedToId) && <option value={draft.assignedToId} disabled>{original?.assignedTo?.name || "Current selection"} (not available for assignment)</option>}
          {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role === "IT_STAFF" ? "Staff" : "Admin"})</option>)}
        </select>
        {staffState === "loading" && <p role="status">Loading assignees…</p>}
        {staffState === "ready" && staff.length === 0 && <p>No eligible assignees available. Unassigned is permitted.</p>}
        {staffState === "error" && <div role="alert">Unable to load assignees. Your selection is preserved. <button type="button" className="btn btn-outline-success" onClick={() => setAttempt(a => a + 1)}>Retry assignees</button></div>}
      </div>}
      <div className="form-check mb-3"><input id={`${prefix}-followUpRequired`} className="form-check-input" type="checkbox" checked={draft.followUpRequired} onChange={e => setDraft({ ...draft, followUpRequired: e.target.checked })} /><label htmlFor={`${prefix}-followUpRequired`} className="form-check-label">Follow-Up Required</label></div>
      {(draft.followUpRequired || draft.followUpNote) && text("followUpNote", "Follow-Up Note")}
      {text("attachmentNotes", "Attachment Notes")}
      <div className="d-flex flex-wrap gap-2">
        <button className="btn btn-success" type="submit">{busy ? "Saving…" : original ? "Save changes" : "Create Action"}</button>
        {original?.status === "PLANNED" && <><button className="btn btn-outline-success" type="button" onClick={e => submit(e, "COMPLETED")}>Complete Action</button><button className="btn btn-outline-danger" type="button" onClick={e => submit(e, "CANCELLED")}>Cancel Action</button></>}
      </div>
    </fieldset>
    <button type="button" className="btn btn-link mt-2" disabled={busy || lockDiscard} onClick={onClose}>Discard draft</button>
  </form>;
}
