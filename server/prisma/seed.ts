import { getPrisma } from "../src/prisma.js";
import bcrypt from "bcryptjs";

/**
 * TokTickIT Lab 3 Idempotent Seed Data Script
 * 
 * DISCLAIMER:
 * Seed credentials and initial password ("Initial123!") are strictly for
 * local development and testing environments and must never be used in production.
 */
async function main() {
  const prisma = getPrisma();
  const initialPasswordHash = await bcrypt.hash("Initial123!", 10);

  // 1. Seed Categories (Idempotent)
  const categories = [
    { name: "Account and Access", isActive: true },
    { name: "Hardware", isActive: true },
    { name: "Software", isActive: true },
    { name: "Network", isActive: true },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { isActive: cat.isActive },
      create: { name: cat.name, isActive: cat.isActive },
    });
  }

  // 2. Seed Related Systems (Idempotent)
  const relatedSystems = [
    { name: "Email", isActive: true },
    { name: "Campus Wi-Fi", isActive: true },
    { name: "VPN", isActive: true },
    { name: "LEB2 App", isActive: true },
    { name: "Grade Submission App", isActive: true },
    { name: "Printer", isActive: true },
    { name: "Corporate Laptop", isActive: true },
  ];

  for (const sys of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: { isActive: sys.isActive },
      create: { name: sys.name, isActive: sys.isActive },
    });
  }

  // 3. Seed Active & Inactive Users across 3 Roles (Idempotent)
  const users = [
    // Requesters (4 Active, 1 Inactive)
    {
      name: "Jennifer Anderson",
      email: "jennifer.a@toktickit.local",
      role: "REQUESTER" as const,
      mustChangePassword: true,
      isActive: true,
    },
    {
      name: "Michael Brown",
      email: "michael.b@toktickit.local",
      role: "REQUESTER" as const,
      mustChangePassword: true,
      isActive: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.j@toktickit.local",
      role: "REQUESTER" as const,
      mustChangePassword: true,
      isActive: true,
    },
    {
      name: "David Lee",
      email: "david.l@toktickit.local",
      role: "REQUESTER" as const,
      mustChangePassword: true,
      isActive: true,
    },
    {
      name: "Inactive Requester",
      email: "inactive.req@toktickit.local",
      role: "REQUESTER" as const,
      mustChangePassword: true,
      isActive: false,
    },

    // IT Staff (3 Active, 1 Inactive)
    {
      name: "Alex Turner",
      email: "alex.t@toktickit.local",
      role: "IT_STAFF" as const,
      mustChangePassword: true,
      isActive: true,
    },
    {
      name: "Kevin Patel",
      email: "kevin.p@toktickit.local",
      role: "IT_STAFF" as const,
      mustChangePassword: true,
      isActive: true,
    },
    {
      name: "Emily Davis",
      email: "emily.d@toktickit.local",
      role: "IT_STAFF" as const,
      mustChangePassword: true,
      isActive: true,
    },
    {
      name: "Inactive Staff",
      email: "inactive.staff@toktickit.local",
      role: "IT_STAFF" as const,
      mustChangePassword: true,
      isActive: false,
    },

    // Administrator (1 Active)
    {
      name: "System Administrator",
      email: "admin@toktickit.local",
      role: "ADMINISTRATOR" as const,
      mustChangePassword: true,
      isActive: true,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: u.isActive,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: initialPasswordHash,
        role: u.role,
        mustChangePassword: u.mustChangePassword,
        isActive: u.isActive,
      },
    });
  }

  console.log("Database seeded successfully with Lab 3 users and reference data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });
