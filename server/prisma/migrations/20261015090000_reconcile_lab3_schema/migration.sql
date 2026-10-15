-- Prerequisite repair, deliberately separate from the Lab 4 data increment.
-- Replay proved that historical SQL leaves Category, while Prisma maps categories.
-- Rename preserves IDs, rows and the existing tickets_categoryId_fkey target.
-- An unexpected pre-existing categories table fails safely; never merge/drop it.
BEGIN;
ALTER TABLE "Category" RENAME TO "categories";
ALTER TABLE "categories" RENAME CONSTRAINT "Category_pkey" TO "categories_pkey";
ALTER INDEX "Category_name_key" RENAME TO "categories_name_key";
ALTER SEQUENCE "Category_id_seq" RENAME TO "categories_id_seq";
-- Align with the existing @updatedAt Prisma field; no existing value is changed.
ALTER TABLE "users" ALTER COLUMN "updatedAt" DROP DEFAULT;
COMMIT;
