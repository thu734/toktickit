-- Requester-scoped Ticket creation retries; additive, with no historical backfill.
-- Existing Tickets retain NULL values and their current identity/number/behavior.
ALTER TABLE "tickets"
  ADD COLUMN "creationRequestKey" TEXT,
  ADD COLUMN "creationPayloadHash" TEXT;
CREATE UNIQUE INDEX "tickets_requesterId_creationRequestKey_key"
  ON "tickets"("requesterId", "creationRequestKey");
