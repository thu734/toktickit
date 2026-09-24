import { execSync } from "child_process";

export default async function globalSetup() {
  const testDbUrl =
    process.env.TEST_DATABASE_URL ||
    "postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public";

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
