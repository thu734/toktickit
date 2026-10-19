import { closeTestServers } from "./testHttpServer.js";
import { afterAll, afterEach } from "vitest";
import { createTestDatabase } from "./lab-04/migrationTestDatabase.js";
import { getPrisma } from "../src/prisma.js";

import { diagnosticLifecycle, diagnosticFailure, observeDatabase } from "./lab-04/regressionDiagnostics.js";

process.env.NODE_ENV = "test";
const original = {
  database: process.env.DATABASE_URL,
  testDatabase: process.env.TEST_DATABASE_URL,
  seedScope: process.env.TOKTICKIT_SEED_SCOPE,
  files: process.env.TOKTICKIT_TEST_FILES,
};
// Each earlier-lab suite gets real migrations and fresh baseline fixtures.
// Lab 4 data/seed suites independently exercise all new demonstration fixtures.
const database = await createTestDatabase();
try {
  database.deployThrough();
  database.seed("baseline");
} catch (error) {
  await database.dispose();
  throw error;
}
process.env.DATABASE_URL = database.url;
process.env.TEST_DATABASE_URL = database.url;
process.env.TOKTICKIT_SEED_SCOPE = "baseline";
process.env.TOKTICKIT_TEST_FILES = database.work;
observeDatabase();
diagnosticLifecycle("schema-ready", { schema: database.schema });
afterEach(context => {
  if (context.task.result?.state === "fail") diagnosticFailure();
});
afterAll(async () => {
  await closeTestServers();
  diagnosticLifecycle("application-disconnect-start", { schema: database.schema });
  await getPrisma().$disconnect();
  diagnosticLifecycle("schema-dispose-start", { schema: database.schema });
  await database.dispose();
  diagnosticLifecycle("schema-dispose-complete", { schema: database.schema });
  for (const [key, value] of Object.entries({
    DATABASE_URL: original.database, TEST_DATABASE_URL: original.testDatabase,
    TOKTICKIT_SEED_SCOPE: original.seedScope, TOKTICKIT_TEST_FILES: original.files,
  })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
