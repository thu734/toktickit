-- Additive Lab 4 foundation; no historical Actions/events or Ticket rewrites.
BEGIN;
-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActionEventType" AS ENUM ('CREATED', 'UPDATED', 'ASSIGNED', 'COMPLETED', 'CANCELLED', 'CORRECTED');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "workflowRevision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "actions_taken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "performedById" INTEGER NOT NULL,
    "assignedToId" INTEGER,
    "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
    "description" VARCHAR(2000) NOT NULL,
    "result" VARCHAR(2000),
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" VARCHAR(1000),
    "attachmentNotes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actions_taken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_audit_events" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" "ActionEventType" NOT NULL,
    "changedFields" JSONB NOT NULL,

    CONSTRAINT "action_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_creation_requests" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "requestKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "originalResult" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_creation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "actions_taken_ticketId_createdAt_id_idx" ON "actions_taken"("ticketId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "actions_taken_assignedToId_status_idx" ON "actions_taken"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "actions_taken_ticketId_status_followUpRequired_idx" ON "actions_taken"("ticketId", "status", "followUpRequired");

-- CreateIndex
CREATE UNIQUE INDEX "actions_taken_id_ticketId_performedById_key" ON "actions_taken"("id", "ticketId", "performedById");

-- CreateIndex
CREATE INDEX "action_audit_events_actionId_timestamp_id_idx" ON "action_audit_events"("actionId", "timestamp", "id");

-- CreateIndex
CREATE UNIQUE INDEX "action_creation_requests_actionId_key" ON "action_creation_requests"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "action_creation_requests_creatorId_ticketId_requestKey_key" ON "action_creation_requests"("creatorId", "ticketId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "action_creation_requests_actionId_ticketId_creatorId_key" ON "action_creation_requests"("actionId", "ticketId", "creatorId");

-- AddForeignKey
ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_audit_events" ADD CONSTRAINT "action_audit_events_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "actions_taken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_audit_events" ADD CONSTRAINT "action_audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_creation_requests" ADD CONSTRAINT "action_creation_requests_actionId_ticketId_creatorId_fkey" FOREIGN KEY ("actionId", "ticketId", "creatorId") REFERENCES "actions_taken"("id", "ticketId", "performedById") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Prisma 5 schema syntax cannot express these SQL-only integrity rules.
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_workflow_revision_nonnegative"
  CHECK ("workflowRevision" >= 0);
ALTER TABLE "actions_taken"
  ADD CONSTRAINT "actions_description_nonblank" CHECK ("description" ~ '[^[:space:]]'),
  ADD CONSTRAINT "actions_terminal_result" CHECK (
    "status" = 'PLANNED' OR ("result" IS NOT NULL AND "result" ~ '[^[:space:]]')),
  ADD CONSTRAINT "actions_followup_note" CHECK (
    NOT "followUpRequired" OR ("followUpNote" IS NOT NULL AND "followUpNote" ~ '[^[:space:]]'));
ALTER TABLE "action_audit_events" ADD CONSTRAINT "action_event_fields_object"
  CHECK (jsonb_typeof("changedFields") = 'object');
ALTER TABLE "action_creation_requests"
  ADD CONSTRAINT "action_request_key_nonblank" CHECK ("requestKey" ~ '[^[:space:]]'),
  ADD CONSTRAINT "action_request_hash_sha256" CHECK ("requestHash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "action_request_result_object" CHECK (jsonb_typeof("originalResult") = 'object');

-- Keep identity/time and evidence immutable even through direct persistence calls.
-- Role checks, transitions, resolution gates and revision increments belong to
-- the later transactional API/workflow issues; these triggers do not implement them.
CREATE FUNCTION "lab4_action_identity_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."ticketId" IS DISTINCT FROM OLD."ticketId"
     OR NEW."performedById" IS DISTINCT FROM OLD."performedById"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'Action identity, creator and creation time are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "action_identity_immutable" BEFORE UPDATE ON "actions_taken"
  FOR EACH ROW EXECUTE FUNCTION "lab4_action_identity_immutable"();

CREATE FUNCTION "lab4_evidence_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Action evidence is append-only' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "action_events_append_only" BEFORE UPDATE OR DELETE ON "action_audit_events"
  FOR EACH ROW EXECUTE FUNCTION "lab4_evidence_append_only"();
CREATE TRIGGER "action_creation_result_immutable" BEFORE UPDATE OR DELETE ON "action_creation_requests"
  FOR EACH ROW EXECUTE FUNCTION "lab4_evidence_append_only"();
COMMIT;
