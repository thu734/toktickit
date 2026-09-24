import { beforeAll } from "vitest";

// Force test environment variables
process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public";

beforeAll(() => {
  const currentDb = process.env.DATABASE_URL || "";
  // Safety guard: prevent running tests against dev database
  if (
    currentDb.endsWith("/toktickit") ||
    currentDb.includes("/toktickit?")
  ) {
    throw new Error(
      "SAFETY BLOCK: Vitest attempted to run against the main development database ('toktickit')! Aborting to prevent data loss."
    );
  }
});
