import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createTestDatabase, TestDatabase, validatedSchemaUrl } from "./migrationTestDatabase.js";

const legacy = "20260905181037_add_attachments";
const lab3 = "20260918211500_evolve_user_and_lab3_models";
const repair = "20261015090000_reconcile_lab3_schema";
const snapshot = async (db: TestDatabase, category = "categories") => {
  const result: Record<string, unknown> = {};
  for (const table of [category, "related_systems", "users", "tickets", "attachments", "comments", "internal_notes"]) {
    const rows = await db.client.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT * FROM "${table}" ORDER BY id`);
    result[table === "Category" ? "categories" : table] = rows.map(({ workflowRevision: _revision, creationRequestKey: _key, creationPayloadHash: _hash, ...row }) => row);
  }
  return result;
};

describe("Actual SQL migration replay and preservation", () => {
  it("reproduces Category drift, upgrades representative Lab 2/3 data, and preserves every earlier record", async () => {
    const db = await createTestDatabase();
    try {
      db.deployThrough(legacy);
      await db.client.$executeRawUnsafe(`INSERT INTO "Category" (id,name) VALUES (101,'Preserved category')`);
      await db.client.$executeRawUnsafe(`INSERT INTO related_systems (id,name) VALUES (101,'Preserved system')`);
      await db.client.$executeRawUnsafe(`INSERT INTO development_requesters (id,name,email,department,"updatedAt") VALUES (101,'Legacy Requester','legacy@example.test','Engineering',CURRENT_TIMESTAMP)`);
      await db.client.$executeRawUnsafe(`INSERT INTO tickets (id,"ticketNumber",summary,description,"currentStatus","requesterId","categoryId","relatedSystemId","updatedAt") VALUES (101,'LEGACY-101','Preserved summary','Preserved description','PENDING',101,101,101,CURRENT_TIMESTAMP)`);
      await db.client.$executeRawUnsafe(`INSERT INTO attachments (id,filename,"storedFilename","mimeType","fileSize","filePath","ticketId","isRemoved","removedAt","removalReason","removedByRequesterId") VALUES (101,'evidence.pdf','legacy.pdf','application/pdf',4,'uploads/legacy.pdf',101,true,CURRENT_TIMESTAMP,'Retain removal evidence',101)`);
      db.deployThrough(lab3);
      const tables = await db.client.$queryRaw<Array<{ name: string }>>`SELECT tablename AS name FROM pg_tables WHERE schemaname=${db.schema}`;
      expect(tables.map(x => x.name)).toContain("Category");
      expect(tables.map(x => x.name)).not.toContain("categories");
      await expect(db.client.category.findMany()).rejects.toThrow();
      await db.client.$executeRawUnsafe(`UPDATE users SET "passwordHash"='preserved-hash',"mustChangePassword"=false WHERE id=101`);
      await db.client.$executeRawUnsafe(`UPDATE tickets SET "itPriority"='URGENT',"assignedStaffId"=101 WHERE id=101`);
      await db.client.$executeRawUnsafe(`INSERT INTO comments ("ticketId","authorId",content) VALUES (101,101,'Preserve public content')`);
      await db.client.$executeRawUnsafe(`INSERT INTO internal_notes ("ticketId","authorId",content) VALUES (101,101,'Preserve private content')`);
      const before = await snapshot(db, "Category");
      db.deployThrough(repair);
      expect(await snapshot(db)).toEqual(before);
      db.deployThrough();
      // Reconnect after DDL: earlier SELECT * plans have the pre-upgrade row type.
      await db.client.$disconnect();
      expect(await snapshot(db)).toEqual(before);
      expect(await db.client.ticket.findUniqueOrThrow({ where: { id: 101 } })).toMatchObject({ workflowRevision: 0, creationRequestKey: null, creationPayloadHash: null });
      expect(await db.client.actionTaken.count()).toBe(0);
      expect(await db.client.actionAuditEvent.count()).toBe(0);
      expect(await db.client.actionCreationRequest.count()).toBe(0);
      expect(db.schemaDiff(readFileSync("prisma/schema.prisma", "utf8"))).toContain("This is an empty migration");
      const applied = await db.client.$queryRawUnsafe<Array<{ migration_name: string }>>(`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`);
      expect(applied).toHaveLength(8);
      expect(applied.map(row => row.migration_name)).toContain("20261019090000_ticket_creation_retry");
      expect(db.deployThrough()).toContain("No pending migrations");
      expect(await snapshot(db)).toEqual(before);
    } finally { await db.dispose(); }
  });

  it("fresh replay matches Prisma and a disposable backup restores data, evidence and file bytes", async () => {
    const db = await createTestDatabase();
    try {
      db.deployThrough(); db.seed();
      expect(db.schemaDiff(readFileSync("prisma/schema.prisma", "utf8"))).toContain("This is an empty migration");
      const file = join(db.work, "fixture-attachment.pdf");
      const bytes = Buffer.from("disposable attachment evidence");
      writeFileSync(file, bytes);
      const ticket = await db.client.ticket.findFirstOrThrow();
      await db.client.attachment.create({ data: {
        ticketId: ticket.id, filename: "fixture-attachment.pdf", storedFilename: "fixture-attachment.pdf",
        filePath: file, mimeType: "application/pdf", fileSize: bytes.length,
      } });
      const before = await snapshot(db);
      const actions = await db.client.actionTaken.findMany({ orderBy: { id: "asc" } });
      const events = await db.client.actionAuditEvent.findMany({ orderBy: { id: "asc" } });
      const requests = await db.client.actionCreationRequest.findMany({ orderBy: { id: "asc" } });
      const backupBytes = readFileSync(file);
      const url = new URL(db.url);
      const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432",
        PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: "toktickit_test" };
      const dump = execFileSync("pg_dump", ["--schema", db.schema, "--no-owner", "--no-privileges"], { env });
      validatedSchemaUrl(db.url, db.schema);
      await db.client.$executeRawUnsafe(`DROP SCHEMA "${db.schema}" CASCADE`);
      writeFileSync(file, "simulated lost file");
      execFileSync("psql", ["-X", "--set", "ON_ERROR_STOP=1", "--quiet"], { env, input: dump, stdio: ["pipe", "pipe", "pipe"] });
      await db.client.$disconnect();
      writeFileSync(file, backupBytes);
      expect(await snapshot(db)).toEqual(before);
      expect(await db.client.actionTaken.findMany({ orderBy: { id: "asc" } })).toEqual(actions);
      expect(await db.client.actionAuditEvent.findMany({ orderBy: { id: "asc" } })).toEqual(events);
      expect(await db.client.actionCreationRequest.findMany({ orderBy: { id: "asc" } })).toEqual(requests);
      expect(readFileSync(file)).toEqual(bytes);
      expect(db.schemaDiff(readFileSync("prisma/schema.prisma", "utf8"))).toContain("This is an empty migration");
    } finally { await db.dispose(); }
  });

  it("refuses ambiguous Category/categories collisions without deleting either table", async () => {
    const db = await createTestDatabase();
    try {
      db.deployThrough(lab3);
      await db.client.$executeRawUnsafe(`INSERT INTO "Category" (name) VALUES ('Historical row')`);
      await db.client.$executeRawUnsafe(`CREATE TABLE categories (id integer PRIMARY KEY, name text)`);
      await db.client.$executeRawUnsafe(`INSERT INTO categories VALUES (77,'Unreconciled row')`);
      expect(() => db.deployThrough(repair)).toThrow();
      expect(await db.client.$queryRawUnsafe(`SELECT name FROM "Category"`)).toEqual([{ name: "Historical row" }]);
      expect(await db.client.$queryRawUnsafe(`SELECT * FROM categories`)).toEqual([{ id: 77, name: "Unreconciled row" }]);
    } finally { await db.dispose(); }
  });
});
