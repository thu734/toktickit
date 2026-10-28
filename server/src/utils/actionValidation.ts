import { ActionStatus, type ActionTaken } from "@prisma/client";

export class ActionValidationError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

const invalid = (message: string, code = "VALIDATION_ERROR"): never => {
  throw new ActionValidationError(code, message);
};

export function actionId(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647 ? value : null;
}

export function workflowRevision(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 2147483647 ? value : null;
}

export function actionText(value: unknown, max: number, required: boolean): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return (required && !trimmed) || trimmed.length > max ? null : trimmed;
}

function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Action payload must be an object.");
  return value as Record<string, unknown>;
}

function field(value: unknown, name: string, max: number, required = false): string | null {
  const parsed = actionText(value, max, required);
  if (parsed === null) invalid(`${name} must be ${required ? "nonblank and " : "a string "}at most ${max} characters.`);
  return parsed || null;
}

function assignee(value: unknown): number | null {
  if (value === null) return null;
  return actionId(value) ?? invalid("assignedToId must be a valid user ID or null.", "INVALID_ASSIGNEE");
}

export function validateActionCreate(input: unknown) {
  const body = objectBody(input);
  const description = field(body.description, "description", 2000, true)!;
  const result = body.result === undefined ? null : field(body.result, "result", 2000);
  const attachmentNotes = body.attachmentNotes === undefined ? null : field(body.attachmentNotes, "attachmentNotes", 1000);
  const followUpRequired = body.followUpRequired === undefined ? false : body.followUpRequired;
  if (typeof followUpRequired !== "boolean") invalid("followUpRequired must be a boolean.");
  const followUpNote = body.followUpNote === undefined ? null : field(body.followUpNote, "followUpNote", 1000);
  if (followUpRequired && !followUpNote) invalid("followUpNote is required when followUpRequired is true.");
  // Only these fields are accepted. Identity, timestamps and initial status are server-owned.
  return { description, result, attachmentNotes, followUpRequired: followUpRequired as boolean,
    followUpNote, assignedToId: body.assignedToId === undefined ? null : assignee(body.assignedToId) };
}

export function isActionTransition(from: ActionStatus, to: unknown): boolean {
  return from === ActionStatus.PLANNED && (to === ActionStatus.COMPLETED || to === ActionStatus.CANCELLED);
}

type CurrentAction = Pick<ActionTaken, "status" | "result" | "followUpRequired" | "followUpNote">;
type ActionChanges = Partial<Pick<ActionTaken,
  "description" | "result" | "assignedToId" | "followUpRequired" | "followUpNote" | "attachmentNotes" | "status">>;

export function validateActionChanges(existing: CurrentAction, input: unknown): ActionChanges {
  const body = objectBody(input);
  const allowed = new Set(["description", "result", "assignedToId", "followUpRequired", "followUpNote", "attachmentNotes", "status", "workflowRevision"]);
  if (Object.keys(body).some(key => !allowed.has(key))) invalid("Request contains unsupported fields.", "INVALID_FIELDS");
  const changes: ActionChanges = {};
  if (body.description !== undefined) changes.description = field(body.description, "description", 2000, true)!;
  if (body.result !== undefined) changes.result = field(body.result, "result", 2000);
  if (body.attachmentNotes !== undefined) changes.attachmentNotes = field(body.attachmentNotes, "attachmentNotes", 1000);
  if (body.assignedToId !== undefined) changes.assignedToId = assignee(body.assignedToId);
  if (body.followUpRequired !== undefined) {
    if (typeof body.followUpRequired !== "boolean") invalid("followUpRequired must be a boolean.");
    changes.followUpRequired = body.followUpRequired as boolean;
  }
  if (body.followUpNote !== undefined) changes.followUpNote = field(body.followUpNote, "followUpNote", 1000);
  if (body.status !== undefined) {
    if (!Object.values(ActionStatus).includes(body.status as ActionStatus)) invalid("Invalid Action status.", "INVALID_STATUS");
    if (!isActionTransition(existing.status, body.status)) invalid("Only PLANNED Actions can be completed or cancelled.", "INVALID_TRANSITION");
    changes.status = body.status as ActionStatus;
  }
  if (existing.status === ActionStatus.COMPLETED && Object.keys(changes).some(key => !["result", "followUpRequired", "followUpNote", "attachmentNotes"].includes(key))) {
    invalid("Only approved completed-Action corrections are allowed.", "IMMUTABLE_ACTION");
  }
  if (existing.status === ActionStatus.CANCELLED && Object.keys(changes).length) invalid("Cancelled Actions cannot be edited.", "IMMUTABLE_ACTION");
  if (!Object.keys(changes).length) invalid("At least one editable field is required.", "NO_CHANGES");
  const finalStatus = changes.status ?? existing.status;
  const finalResult = changes.result !== undefined ? changes.result : existing.result;
  if (finalStatus !== ActionStatus.PLANNED && (typeof finalResult !== "string" || !finalResult.trim())) invalid("result is required for terminal Actions.");
  const finalFollowUp = changes.followUpRequired ?? existing.followUpRequired;
  const finalNote = changes.followUpNote !== undefined ? changes.followUpNote : existing.followUpNote;
  if (finalFollowUp && (typeof finalNote !== "string" || !finalNote.trim())) invalid("followUpNote is required when followUpRequired is true.");
  return changes;
}
