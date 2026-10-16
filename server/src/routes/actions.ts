import { lockTicket } from "../services/ticketWorkflow.js";
import { Router, Request, Response } from "express";
import { ActionEventType, ActionStatus, Prisma, TicketStatus, UserRole } from "@prisma/client";
import { createHash } from "node:crypto";
import { getPrisma } from "../prisma.js";
import { requireAuth } from "../middleware/authorization.js";
import { ActionValidationError, actionId, actionText, workflowRevision, validateActionCreate, validateActionChanges } from "../utils/actionValidation.js";

export const actionsRouter = Router();

const staffRoles: UserRole[] = ["IT_STAFF", "ADMINISTRATOR"];
const actionSelect = {
  id: true, ticketId: true, performedById: true, assignedToId: true,
  status: true, description: true, result: true, followUpRequired: true,
  followUpNote: true, attachmentNotes: true, createdAt: true, updatedAt: true,
  performedBy: { select: { id: true, name: true, email: true, role: true } },
  assignedTo: { select: { id: true, name: true, email: true, role: true, isActive: true } },
} satisfies Prisma.ActionTakenSelect;

function fail(res: Response, status: number, code: string, message: string) {
  const error = status === 400 ? "Bad Request" : status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : status === 404 ? "Not Found" : status === 409 ? "Conflict" : "Internal Server Error";
  return res.status(status).json({ error, code, message });
}

function integer(value: unknown): number | null {
  // Route parameters are decimal strings; body identifiers are strict numbers.
  return typeof value === "string" && /^\d+$/.test(value) ? actionId(Number(value)) : null;
}

function userId(req: Request): number | null { return req.session.userId ?? null; }

async function currentUser(req: Request) {
  const id = userId(req);
  return id === null ? null : getPrisma().user.findUnique({ where: { id } });
}

async function canAccessTicket(req: Request, ticketId: number) {
  const user = await currentUser(req);
  if (!user || !user.isActive) return { kind: "unauthenticated" as const };
  const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { kind: "missing" as const };
  if (user.role === "REQUESTER" && ticket.requesterId !== user.id) return { kind: "missing" as const };
  return { kind: "ok" as const, user, ticket };
}

function ticketAllowsActionWrite(ticket: { currentStatus: string }) {
  return !["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.currentStatus);
}

async function validateAssignee(tx: Prisma.TransactionClient, assignedToId: number | null) {
  if (assignedToId === null) return null;
  const assignee = await tx.user.findUnique({ where: { id: assignedToId } });
  return assignee && assignee.isActive && staffRoles.includes(assignee.role) ? null : "assignedTo must be an active IT Staff or Administrator";
}

function canonical(value: unknown) { return JSON.stringify(value, Object.keys(value as object).sort()); }

async function advanceRevision(tx: Prisma.TransactionClient, ticketId: number, expectedRevision: number) {
  const updated = await tx.ticket.updateMany({ where: { id: ticketId, workflowRevision: expectedRevision, currentStatus: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED] } }, data: { workflowRevision: { increment: 1 } } });
  if (updated.count !== 1) {
    const current = await tx.ticket.findUnique({ where: { id: ticketId }, select: { currentStatus: true } });
    if (current && !ticketAllowsActionWrite(current)) throw Object.assign(new Error("ticket is not writable"), { code: "TICKET_NOT_WRITABLE" });
    throw Object.assign(new Error("stale workflow revision"), { code: "STALE_REVISION" });
  }
}

actionsRouter.get("/tickets/:ticketId/actions-taken", requireAuth, async (req, res) => {
  try {
    const ticketId = integer(req.params.ticketId);
    if (ticketId === null) return fail(res, 400, "INVALID_TICKET_ID", "Invalid Ticket ID.");
    const access = await canAccessTicket(req, ticketId);
    if (access.kind === "unauthenticated") return fail(res, 401, "UNAUTHENTICATED", "Authentication required.");
    if (access.kind === "missing") return fail(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    const actions = await getPrisma().actionTaken.findMany({
      where: { ticketId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: actionSelect,
    });
    return res.status(200).json({ actions, workflowRevision: access.ticket.workflowRevision });
  } catch (error) {
    console.error("Error retrieving Actions:", error);
    return res.status(500).json({ error: "Internal Server Error", code: "INTERNAL_ERROR" });
  }
});

actionsRouter.post("/tickets/:ticketId/actions-taken", requireAuth, async (req, res) => {
  try {
    const ticketId = integer(req.params.ticketId);
    if (ticketId === null) return fail(res, 400, "INVALID_TICKET_ID", "Invalid Ticket ID.");
    const access = await canAccessTicket(req, ticketId);
    if (access.kind === "unauthenticated") return fail(res, 401, "UNAUTHENTICATED", "Authentication required.");
    if (access.kind === "missing") return fail(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    if (!staffRoles.includes(access.user.role)) return fail(res, 403, "FORBIDDEN", "Requesters cannot create Actions.");
    const expectedRevision = workflowRevision(req.body?.workflowRevision);
    if (expectedRevision === null) return fail(res, 400, "INVALID_WORKFLOW_REVISION", "workflowRevision is required.");
    const requestKey = actionText(req.body?.requestKey, 255, true);
    if (!requestKey) return fail(res, 400, "INVALID_REQUEST_KEY", "requestKey is required.");
    const parsed = validateActionCreate(req.body);
    const creatorId = access.user.id;
    const payload = { ...parsed, ticketId, performedById: creatorId, status: ActionStatus.PLANNED };
    const requestHash = createHash("sha256").update(canonical(payload)).digest("hex");
    const result = await getPrisma().$transaction(async (tx) => {
      await lockTicket(tx, ticketId);
      const existing = await tx.actionCreationRequest.findUnique({ where: { creatorId_ticketId_requestKey: { creatorId, ticketId, requestKey } } });
      if (existing) {
        if (existing.requestHash !== requestHash) throw Object.assign(new Error("request key already used with a different payload"), { code: "RETRY_CONFLICT" });
        return { replay: true, value: existing.originalResult as any };
      }
      await advanceRevision(tx, ticketId, expectedRevision);
      const assigneeError = await validateAssignee(tx, parsed.assignedToId);
      if (assigneeError) throw new ActionValidationError("INVALID_ASSIGNEE", assigneeError);
      const action = await tx.actionTaken.create({ data: payload, select: actionSelect });
      const nextRevision = expectedRevision + 1;
      await tx.actionAuditEvent.create({ data: { actionId: action.id, actorId: creatorId, eventType: ActionEventType.CREATED, changedFields: payload as unknown as Prisma.InputJsonObject } });
      const originalResult = { action, workflowRevision: nextRevision } as unknown as Prisma.InputJsonObject;
      await tx.actionCreationRequest.create({ data: { actionId: action.id, ticketId, creatorId, requestKey, requestHash, originalResult } });
      return { replay: false, value: originalResult };
    });
    return res.status(201).json(result.value);
  } catch (error: any) {
    if (error instanceof ActionValidationError) return fail(res, 400, error.code, error.message);
    if (error?.code === "RESOURCE_NOT_FOUND") return fail(res, 404, error.code, error.message);
    if (error?.code === "STALE_REVISION") return fail(res, 409, "STALE_REVISION", "Ticket changed; refresh before retrying.");
    if (error?.code === "TICKET_NOT_WRITABLE") return fail(res, 409, "TICKET_NOT_WRITABLE", "Actions cannot be changed on a resolved, closed, or cancelled Ticket.");
    if (error?.code === "RETRY_CONFLICT") return fail(res, 409, "REQUEST_KEY_REUSED", error.message);
    console.error("Error creating Action:", error);
    return res.status(500).json({ error: "Internal Server Error", code: "INTERNAL_ERROR" });
  }
});

actionsRouter.patch("/tickets/:ticketId/actions-taken/:actionId", requireAuth, async (req, res) => {
  try {
    const ticketId = integer(req.params.ticketId);
    const targetActionId = integer(req.params.actionId);
    if (ticketId === null || targetActionId === null) return fail(res, 400, "INVALID_ID", "Invalid Ticket or Action ID.");
    const access = await canAccessTicket(req, ticketId);
    if (access.kind === "unauthenticated") return fail(res, 401, "UNAUTHENTICATED", "Authentication required.");
    if (access.kind === "missing") return fail(res, 404, "RESOURCE_NOT_FOUND", "Ticket not found.");
    if (!staffRoles.includes(access.user.role)) return fail(res, 403, "FORBIDDEN", "Requesters cannot modify Actions.");
    const expectedRevision = workflowRevision(req.body?.workflowRevision);
    if (expectedRevision === null) return fail(res, 400, "INVALID_WORKFLOW_REVISION", "workflowRevision is required.");
    const actorId = access.user.id;
    const result = await getPrisma().$transaction(async (tx) => {
      await lockTicket(tx, ticketId);
      const existing = await tx.actionTaken.findFirst({ where: { id: targetActionId, ticketId } });
      if (!existing) throw Object.assign(new Error("Action not found."), { code: "RESOURCE_NOT_FOUND" });
      await advanceRevision(tx, ticketId, expectedRevision);
      const changes = validateActionChanges(existing, req.body);
      if (changes.assignedToId !== undefined) {
        const assigneeError = await validateAssignee(tx, changes.assignedToId);
        if (assigneeError) throw new ActionValidationError("INVALID_ASSIGNEE", assigneeError);
      }
      const updatedAction = await tx.actionTaken.update({ where: { id: targetActionId }, data: changes, select: actionSelect });
      const eventType = changes.status === ActionStatus.COMPLETED ? ActionEventType.COMPLETED : changes.status === ActionStatus.CANCELLED ? ActionEventType.CANCELLED : changes.assignedToId !== undefined ? ActionEventType.ASSIGNED : existing.status === ActionStatus.COMPLETED ? ActionEventType.CORRECTED : ActionEventType.UPDATED;
      await tx.actionAuditEvent.create({ data: { actionId: targetActionId, actorId, eventType, changedFields: changes as Prisma.InputJsonObject } });
      return { action: updatedAction, workflowRevision: expectedRevision + 1 };
    });
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof ActionValidationError) return fail(res, 400, error.code, error.message);
    if (error?.code === "RESOURCE_NOT_FOUND") return fail(res, 404, error.code, error.message);
    if (error?.code === "STALE_REVISION") return fail(res, 409, "STALE_REVISION", "Ticket changed; refresh before retrying.");
    if (error?.code === "TICKET_NOT_WRITABLE") return fail(res, 409, "TICKET_NOT_WRITABLE", "Actions cannot be changed on a resolved, closed, or cancelled Ticket.");
    console.error("Error updating Action:", error);
    return res.status(500).json({ error: "Internal Server Error", code: "INTERNAL_ERROR" });
  }
});
