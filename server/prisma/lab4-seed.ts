import { ActionStatus, Prisma, TicketStatus } from "@prisma/client";
import { createHash } from "node:crypto";

/** New demonstration records only: never backfill Actions onto existing Tickets. */
export async function seedLab4(prisma: Prisma.TransactionClient, passwordHash: string) {
  const category = await prisma.category.upsert({
    where: { name: "Lab 4 Service Desk" }, update: {}, create: { name: "Lab 4 Service Desk" },
  });
  const system = await prisma.relatedSystem.upsert({
    where: { name: "Lab 4 Demonstration Workstation" }, update: {}, create: { name: "Lab 4 Demonstration Workstation" },
  });
  const user = (email: string, name: string, role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") =>
    prisma.user.upsert({ where: { email }, update: {}, create: { email, name, role, passwordHash } });
  const requester = await user("lab4.requester@toktickit.local", "Lab 4 Requester", "REQUESTER");
  await user("lab4.empty@toktickit.local", "Lab 4 Empty Dashboard", "REQUESTER");
  const owner = await user("lab4.owner@toktickit.local", "Lab 4 Ticket Owner", "IT_STAFF");
  const worker = await user("lab4.worker@toktickit.local", "Lab 4 Technician", "IT_STAFF");
  const admin = await user("lab4.admin@toktickit.local", "Lab 4 Administrator", "ADMINISTRATOR");

  const planned = (assignedToId: number | null) => ({ status: ActionStatus.PLANNED, assignedToId, followUpRequired: false });
  const completed = (followUpRequired: boolean) => ({ status: ActionStatus.COMPLETED, assignedToId: worker.id, followUpRequired });
  const scenarios = [
    { status: TicketStatus.NEW, actions: [] },
    { status: TicketStatus.OPEN, actions: [planned(worker.id)] },
    { status: TicketStatus.IN_PROGRESS, actions: [planned(null), completed(false)] },
    { status: TicketStatus.WAITING_FOR_REQUESTER, actions: [completed(true)] },
    { status: TicketStatus.RESOLVED, actions: [completed(false)] },
    { status: TicketStatus.CLOSED, actions: [{ status: ActionStatus.CANCELLED, assignedToId: null, followUpRequired: false }] },
    { status: TicketStatus.REOPENED, actions: [completed(true), planned(admin.id)] },
    { status: TicketStatus.CANCELLED, actions: [] },
  ];
  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
  for (const [i, scenario] of scenarios.entries()) {
    const ticketNumber = `TKT-2026-${String(40001 + i).padStart(6, "0")}`;
    // Existing fixture state is user-owned after creation, including missing Actions.
    if (await prisma.ticket.findUnique({ where: { ticketNumber } })) continue;
    for (const actor of [worker, admin]) {
      if (!actor.isActive || !["IT_STAFF", "ADMINISTRATOR"].includes(actor.role)) {
        throw new Error("Cannot create new Lab 4 fixtures with an inactive/ineligible seed actor; existing accounts were not changed.");
      }
    }
    const ticket = await prisma.ticket.create({ data: {
      ticketNumber, summary: `Lab 4 workstation support: ${scenario.status}`,
      description: "Demonstration of service-desk work, follow-up and dashboard states.",
      currentStatus: scenario.status, requesterId: requester.id,
      assignedStaffId: i % 2 === 0 ? null : owner.id,
      categoryId: category.id, relatedSystemId: system.id,
      requestedPriority: priorities[i % priorities.length], itPriority: priorities[i % priorities.length],
      resolutionSummary: scenario.status === TicketStatus.RESOLVED || scenario.status === TicketStatus.CLOSED ? "Demonstration work finished." : null,
    } });
    for (const [j, sample] of scenario.actions.entries()) {
      const creator = j % 2 === 0 ? worker : admin;
      const payload = {
        description: `Inspect workstation and record diagnostic step ${j + 1}.`,
        result: sample.status === ActionStatus.PLANNED ? null : sample.status === ActionStatus.CANCELLED
          ? "Diagnostic step cancelled because the duplicate task was unnecessary."
          : "Diagnostic step completed and findings recorded.",
        status: sample.status, assignedToId: sample.assignedToId,
        followUpRequired: sample.followUpRequired,
        followUpNote: sample.followUpRequired ? "Confirm workstation behavior with the Requester." : null,
        attachmentNotes: "Consult existing Ticket attachments if provided; this fixture creates no file.",
      };
      const action = await prisma.actionTaken.create({ data: { ...payload, ticketId: ticket.id, performedById: creator.id } });
      const updatedTicket = await prisma.ticket.update({ where: { id: ticket.id }, data: { workflowRevision: { increment: 1 } } });
      await prisma.actionAuditEvent.create({ data: {
        actionId: action.id, actorId: creator.id, eventType: "CREATED",
        // Records this fixture insertion only; no fictional historical transitions.
        changedFields: payload,
      } });
      await prisma.actionCreationRequest.create({ data: {
        actionId: action.id, ticketId: ticket.id, creatorId: creator.id,
        requestKey: `lab4-seed:${ticketNumber}:${j + 1}`,
        requestHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
        originalResult: JSON.parse(JSON.stringify({ action, workflowRevision: updatedTicket.workflowRevision })) as Prisma.InputJsonObject,
      } });
    }
  }
}
