import { afterAll } from "vitest";
import { createTestDatabase } from "./lab-04/migrationTestDatabase.js";
import { getPrisma } from "../src/prisma.js";

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
afterAll(async () => {
  await getPrisma().$disconnect();
  await database.dispose();
  for (const [key, value] of Object.entries({
    DATABASE_URL: original.database, TEST_DATABASE_URL: original.testDatabase,
    TOKTICKIT_SEED_SCOPE: original.seedScope, TOKTICKIT_TEST_FILES: original.files,
  })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
