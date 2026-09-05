import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();

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

  // 3. Seed Development Requesters (4 Active, 1 Inactive) (Idempotent)
  const requesters = [
    {
      name: "Jennifer Anderson",
      email: "jennifer.a@toktickit.local",
      department: "Marketing",
      isActive: true,
    },
    {
      name: "Michael Brown",
      email: "michael.b@toktickit.local",
      department: "IT Support",
      isActive: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.j@toktickit.local",
      department: "Human Resources",
      isActive: true,
    },
    {
      name: "David Lee",
      email: "david.l@toktickit.local",
      department: "Engineering",
      isActive: true,
    },
    {
      name: "Robert Smith",
      email: "robert.s@toktickit.local",
      department: "Finance",
      isActive: false, // Inactive requester
    },
  ];

  for (const req of requesters) {
    await prisma.developmentRequester.upsert({
      where: { email: req.email },
      update: {
        name: req.name,
        department: req.department,
        isActive: req.isActive,
      },
      create: {
        name: req.name,
        email: req.email,
        department: req.department,
        isActive: req.isActive,
      },
    });
  }

  console.log("Database seeded successfully with Lab 2 reference data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
