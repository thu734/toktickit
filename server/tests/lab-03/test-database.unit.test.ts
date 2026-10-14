import { describe, it, expect, vi } from "vitest";
import { resolveTestDatabaseUrl } from "../testDatabase.js";
import globalSetup from "../globalSetup.js";
import { execSync } from "child_process";

vi.mock("child_process", () => ({ execSync: vi.fn() }));

describe("Test database safety before setup mutations", () => {
  it("accepts only the dedicated test database", () => {
    expect(resolveTestDatabaseUrl("postgresql://localhost/toktickit_test?schema=public"))
      .toContain("/toktickit_test");
  });

  it.each([
    "postgresql://localhost/toktickit",
    "postgresql://localhost/toktickit?schema=public",
    "postgresql://localhost/%74oktickit",
    "postgresql://localhost/other_database",
    "https://localhost/toktickit_test",
    "invalid-url",
  ])("rejects unsafe URL %s before running Prisma or seed", async (url) => {
    vi.clearAllMocks();
    vi.stubEnv("TEST_DATABASE_URL", url);
    try {
      await expect(globalSetup()).rejects.toThrow("SAFETY BLOCK");
      expect(execSync).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
