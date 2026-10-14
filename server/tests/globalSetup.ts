import { execSync } from "child_process";
import { resolveTestDatabaseUrl } from "./testDatabase.js";

export default async function globalSetup() {
  // Validate before invoking any command that can change schema or data.
  const testDbUrl = resolveTestDatabaseUrl();

  const env = { ...process.env, DATABASE_URL: testDbUrl };

  try {
    // Sync Prisma schema to test database
    execSync("npx prisma db push --skip-generate", {
      env,
      stdio: "inherit",
    });

    // Seed test database with reference data and users
    execSync("npx prisma db seed", {
      env,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Failed to setup test database:", error);
    throw error;
  }
}
