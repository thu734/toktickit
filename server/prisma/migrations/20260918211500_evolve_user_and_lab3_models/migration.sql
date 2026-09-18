-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- CreateTable users
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'REQUESTER',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Migrate existing development_requesters into users
INSERT INTO "users" ("id", "name", "email", "passwordHash", "role", "mustChangePassword", "isActive", "createdAt", "updatedAt")
SELECT "id", "name", "email", '$2b$10$LSzZroyZJ/v7BiuKKcND9OSjueHFRwkrWFzuwxPv0tUtG8L0o5h6u', 'REQUESTER'::"UserRole", true, "isActive", "createdAt", "updatedAt"
FROM "development_requesters";

-- Reset users sequence
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM "users"), 1));

-- Convert TicketStatus enum safely
ALTER TABLE "tickets" ALTER COLUMN "currentStatus" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "currentStatus" TYPE text USING "currentStatus"::text;
UPDATE "tickets" SET "currentStatus" = 'WAITING_FOR_REQUESTER' WHERE "currentStatus" = 'PENDING';
DROP TYPE IF EXISTS "TicketStatus";
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED');
ALTER TABLE "tickets" ALTER COLUMN "currentStatus" TYPE "TicketStatus" USING "currentStatus"::"TicketStatus";
ALTER TABLE "tickets" ALTER COLUMN "currentStatus" SET DEFAULT 'NEW'::"TicketStatus";

-- Convert ITPriority enum safely
ALTER TABLE "tickets" ALTER COLUMN "itPriority" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "itPriority" TYPE text USING "itPriority"::text;
UPDATE "tickets" SET "itPriority" = "requestedPriority"::text;
DROP TYPE IF EXISTS "ITPriority";
CREATE TYPE "ITPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
ALTER TABLE "tickets" ALTER COLUMN "itPriority" TYPE "ITPriority" USING "itPriority"::"ITPriority";
ALTER TABLE "tickets" ALTER COLUMN "itPriority" SET DEFAULT 'MEDIUM'::"ITPriority";

-- Create comments table
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- Create internal_notes table
CREATE TABLE "internal_notes" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- Alter tickets table
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assignedStaffId" INTEGER;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "resolutionSummary" TEXT;

-- Create Indexes
CREATE INDEX IF NOT EXISTS "tickets_assignedStaffId_idx" ON "tickets"("assignedStaffId");
CREATE INDEX IF NOT EXISTS "tickets_itPriority_idx" ON "tickets"("itPriority");
CREATE INDEX IF NOT EXISTS "comments_ticketId_idx" ON "comments"("ticketId");
CREATE INDEX IF NOT EXISTS "internal_notes_ticketId_idx" ON "internal_notes"("ticketId");

-- Foreign Keys
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_requesterId_fkey";
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_removedByRequesterId_fkey";
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_removedByRequesterId_fkey" FOREIGN KEY ("removedByRequesterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "comments" ADD CONSTRAINT "comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop legacy table development_requesters
DROP TABLE IF EXISTS "development_requesters";
