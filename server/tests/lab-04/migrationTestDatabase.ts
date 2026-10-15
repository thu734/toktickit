import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { resolveTestDatabaseUrl } from "../testDatabase.js";

const prismaCli = resolve("node_modules/prisma/build/index.js");

export function validatedSchemaUrl(base: string, schema: string): string {
  const url = new URL(resolveTestDatabaseUrl(base));
  if (!/^lab4_test_[a-f0-9]{32}$/.test(schema)) {
    throw new Error("SAFETY BLOCK: only generated Lab 4 test schemas may be managed.");
  }
  url.searchParams.set("schema", schema);
  return url.toString();
}

/** Owns one random schema, never public or the development database. */
export async function createTestDatabase() {
  const base = resolveTestDatabaseUrl(); // Validate BEFORE client construction or mutation.
  const schema = `lab4_test_${randomUUID().replaceAll("-", "")}`;
  const url = validatedSchemaUrl(base, schema);
  const admin = new PrismaClient({ datasources: { db: { url: base } } });
  const work = mkdtempSync(join(tmpdir(), "toktickit-lab4-"));
  const client = new PrismaClient({ datasources: { db: { url } } });
  const env = { ...process.env, DATABASE_URL: url, TEST_DATABASE_URL: url };
  try {
    const [target] = await admin.$queryRawUnsafe<Array<{ name: string }>>("SELECT current_database() AS name");
    if (target.name !== "toktickit_test") throw new Error("SAFETY BLOCK: unexpected database.");
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  } catch (error) {
    await admin.$disconnect();
    await client.$disconnect();
    rmSync(work, { recursive: true, force: true });
    throw error;
  }

  return {
    client, schema, url, env, work,
    deployThrough(last?: string) {
      const migrationRoot = join(work, "migrations");
      for (const name of readdirSync("prisma/migrations").sort()) {
        if (name === "migration_lock.toml" || (!name.includes(".") && (!last || name <= last))) {
          cpSync(join("prisma/migrations", name), join(migrationRoot, name), { recursive: true });
        }
      }
      cpSync("prisma/schema.prisma", join(work, "schema.prisma"));
      return execFileSync(process.execPath, [prismaCli, "migrate", "deploy", "--schema", join(work, "schema.prisma")], { env, encoding: "utf8", stdio: "pipe" });
    },
    seed(scope: "all" | "baseline" = "all") {
      execFileSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
        env: { ...env, TOKTICKIT_SEED_SCOPE: scope }, stdio: "pipe",
      });
    },
    schemaDiff(datamodel: string) {
      const file = join(work, "compare.prisma");
      writeFileSync(file, datamodel);
      return execFileSync(process.execPath, [prismaCli, "migrate", "diff", "--from-url", url, "--to-schema-datamodel", file, "--script"], { env, encoding: "utf8", stdio: "pipe" });
    },
    async dispose() {
      await client.$disconnect();
      try {
        validatedSchemaUrl(base, schema);
        await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        await admin.$disconnect();
        rmSync(work, { recursive: true, force: true });
      }
    },
  };
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;
