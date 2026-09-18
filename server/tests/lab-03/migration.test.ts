import { describe, it, expect, beforeAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("MIG-01: Database User Model & Migration Verification", () => {
  const prisma = getPrisma();

  it("should have migrated users table populated with active and inactive accounts across roles", async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThanOrEqual(10);

    const requesters = users.filter((u) => u.role === "REQUESTER");
    const staff = users.filter((u) => u.role === "IT_STAFF");
    const admin = users.filter((u) => u.role === "ADMINISTRATOR");

    expect(requesters.length).toBeGreaterThanOrEqual(5); // 4 active + 1 inactive
    expect(staff.length).toBeGreaterThanOrEqual(4); // 3 active + 1 inactive
    expect(admin.length).toBeGreaterThanOrEqual(1); // 1 active admin
  });

  it("should set initial password hash and mustChangePassword = true for seeded accounts", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@toktickit.local" },
    });

    expect(admin).toBeDefined();
    expect(admin?.mustChangePassword).toBe(true);
    expect(admin?.passwordHash).toBeDefined();
    expect(admin?.passwordHash.length).toBeGreaterThan(20);
  });

  it("should maintain existing category and related system relations without data loss", async () => {
    const categories = await prisma.category.findMany();
    const relatedSystems = await prisma.relatedSystem.findMany();

    expect(categories.length).toBeGreaterThanOrEqual(4);
    expect(relatedSystems.length).toBeGreaterThanOrEqual(7);
  });
});
