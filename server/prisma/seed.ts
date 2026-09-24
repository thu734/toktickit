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
        passwordHash: initialPasswordHash,
        mustChangePassword: u.mustChangePassword,
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

  // 4. Seed 15 Realistic IT Tickets for Staff Queue Pagination & Testing (Idempotent)
  const allCategories = await prisma.category.findMany();
  const allSystems = await prisma.relatedSystem.findMany();
  const allUsers = await prisma.user.findMany();

  const getCatId = (name: string) => allCategories.find((c) => c.name === name)?.id || allCategories[0].id;
  const getSysId = (name: string) => allSystems.find((s) => s.name === name)?.id || allSystems[0].id;
  const getUserId = (email: string) => allUsers.find((u) => u.email === email)?.id || allUsers[0].id;

  const ticketsToSeed = [
    {
      ticketNumber: "TKT-2026-000001",
      summary: "VPN Drops repeatedly when working off-campus",
      description: "When connecting via VPN from home, the session drops every 10-15 minutes requiring re-authentication.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "OPEN" as const,
      requesterId: getUserId("jennifer.a@toktickit.local"),
      assignedStaffId: getUserId("alex.t@toktickit.local"),
      categoryId: getCatId("Network"),
      relatedSystemId: getSysId("VPN"),
    },
    {
      ticketNumber: "TKT-2026-000002",
      summary: "LEB2 assignment submission fails with HTTP 500 error",
      description: "Students report HTTP 500 Internal Server Error when uploading PDF files over 5MB in LEB2 assignment portal.",
      requestedPriority: "URGENT" as const,
      itPriority: "URGENT" as const,
      currentStatus: "IN_PROGRESS" as const,
      requesterId: getUserId("michael.b@toktickit.local"),
      assignedStaffId: getUserId("kevin.p@toktickit.local"),
      categoryId: getCatId("Software"),
      relatedSystemId: getSysId("LEB2 App"),
    },
    {
      ticketNumber: "TKT-2026-000003",
      summary: "Monitor flickering on workstation display",
      description: "Primary external monitor flickers intermittently during video calls and high resolution display.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "LOW" as const,
      currentStatus: "NEW" as const,
      requesterId: getUserId("sarah.j@toktickit.local"),
      assignedStaffId: null,
      categoryId: getCatId("Hardware"),
      relatedSystemId: getSysId("Corporate Laptop"),
    },
    {
      ticketNumber: "TKT-2026-000004",
      summary: "Email mailbox quota full error warning",
      description: "Received automated warning that mailbox storage has reached 98% capacity.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "WAITING_FOR_REQUESTER" as const,
      requesterId: getUserId("david.l@toktickit.local"),
      assignedStaffId: getUserId("emily.d@toktickit.local"),
      categoryId: getCatId("Account and Access"),
      relatedSystemId: getSysId("Email"),
    },
    {
      ticketNumber: "TKT-2026-000005",
      summary: "Campus Wi-Fi authentication fails in Science Building 3",
      description: "Eduroam and campus Wi-Fi reject credentials when connecting inside Science Building 3 floor 2.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "OPEN" as const,
      requesterId: getUserId("jennifer.a@toktickit.local"),
      assignedStaffId: getUserId("alex.t@toktickit.local"),
      categoryId: getCatId("Network"),
      relatedSystemId: getSysId("Campus Wi-Fi"),
    },
    {
      ticketNumber: "TKT-2026-000006",
      summary: "Grade Submission App missing term dropdown options",
      description: "Faculty members cannot select 2026 Term 1 in the grade submission portal dropdown.",
      requestedPriority: "URGENT" as const,
      itPriority: "URGENT" as const,
      currentStatus: "IN_PROGRESS" as const,
      requesterId: getUserId("michael.b@toktickit.local"),
      assignedStaffId: getUserId("kevin.p@toktickit.local"),
      categoryId: getCatId("Software"),
      relatedSystemId: getSysId("Grade Submission App"),
    },
    {
      ticketNumber: "TKT-2026-000007",
      summary: "Paper jam error on 2nd floor library printer",
      description: "Heavy paper jam on tray 2 requiring IT technician inspection.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "RESOLVED" as const,
      resolutionSummary: "Cleared paper jam and replaced feed roller assembly.",
      requesterId: getUserId("sarah.j@toktickit.local"),
      assignedStaffId: getUserId("emily.d@toktickit.local"),
      categoryId: getCatId("Hardware"),
      relatedSystemId: getSysId("Printer"),
    },
    {
      ticketNumber: "TKT-2026-000008",
      summary: "Password reset link expired before initial login",
      description: "Password reset link sent to secondary email expired after 24 hours.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "CLOSED" as const,
      resolutionSummary: "Generated and dispatched new temporary password link.",
      requesterId: getUserId("david.l@toktickit.local"),
      assignedStaffId: getUserId("alex.t@toktickit.local"),
      categoryId: getCatId("Account and Access"),
      relatedSystemId: getSysId("Email"),
    },
    {
      ticketNumber: "TKT-2026-000009",
      summary: "Corporate laptop battery overheating during fast charge",
      description: "Laptop bottom chassis becomes excessively hot when plugged into 65W USB-C charger.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "NEW" as const,
      requesterId: getUserId("jennifer.a@toktickit.local"),
      assignedStaffId: null,
      categoryId: getCatId("Hardware"),
      relatedSystemId: getSysId("Corporate Laptop"),
    },
    {
      ticketNumber: "TKT-2026-000010",
      summary: "LEB2 grade roster CSV export timing out",
      description: "Exporting class roster of 300+ students results in gateway timeout error.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "OPEN" as const,
      requesterId: getUserId("michael.b@toktickit.local"),
      assignedStaffId: getUserId("emily.d@toktickit.local"),
      categoryId: getCatId("Software"),
      relatedSystemId: getSysId("LEB2 App"),
    },
    {
      ticketNumber: "TKT-2026-000011",
      summary: "VPN client fails to connect on macOS Sequoia",
      description: "GlobalProtect VPN client fails certificate verification after macOS system update.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "NEW" as const,
      requesterId: getUserId("sarah.j@toktickit.local"),
      assignedStaffId: null,
      categoryId: getCatId("Network"),
      relatedSystemId: getSysId("VPN"),
    },
    {
      ticketNumber: "TKT-2026-000012",
      summary: "Request access permission to department shared network folder",
      description: "Need read/write permissions for Engineering Department shared drive folder.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "IN_PROGRESS" as const,
      requesterId: getUserId("david.l@toktickit.local"),
      assignedStaffId: getUserId("kevin.p@toktickit.local"),
      categoryId: getCatId("Account and Access"),
      relatedSystemId: getSysId("Email"),
    },
    {
      ticketNumber: "TKT-2026-000013",
      summary: "Wi-Fi signal drops during online lecture streaming",
      description: "Wi-Fi connection drops in Auditorium A every 45 minutes during live stream.",
      requestedPriority: "URGENT" as const,
      itPriority: "HIGH" as const,
      currentStatus: "REOPENED" as const,
      requesterId: getUserId("jennifer.a@toktickit.local"),
      assignedStaffId: getUserId("alex.t@toktickit.local"),
      categoryId: getCatId("Network"),
      relatedSystemId: getSysId("Campus Wi-Fi"),
    },
    {
      ticketNumber: "TKT-2026-000014",
      summary: "Printer driver installation blocked by administrative security policy",
      description: "Attempting to install network printer driver prompts for administrator credentials.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "NEW" as const,
      requesterId: getUserId("michael.b@toktickit.local"),
      assignedStaffId: null,
      categoryId: getCatId("Software"),
      relatedSystemId: getSysId("Printer"),
    },
    {
      ticketNumber: "TKT-2026-000015",
      summary: "Dual monitor setup not detected through USB-C docking station",
      description: "Plugging laptop into office dock only drives single monitor; second monitor remains dark.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "OPEN" as const,
      requesterId: getUserId("sarah.j@toktickit.local"),
      assignedStaffId: getUserId("emily.d@toktickit.local"),
      categoryId: getCatId("Hardware"),
      relatedSystemId: getSysId("Corporate Laptop"),
    },
  ];

  for (const t of ticketsToSeed) {
    await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        resolutionSummary: t.resolutionSummary || null,
        requesterId: t.requesterId,
        assignedStaffId: t.assignedStaffId,
        categoryId: t.categoryId,
        relatedSystemId: t.relatedSystemId,
      },
      create: {
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        resolutionSummary: t.resolutionSummary || null,
        requesterId: t.requesterId,
        assignedStaffId: t.assignedStaffId,
        categoryId: t.categoryId,
        relatedSystemId: t.relatedSystemId,
      },
    });
  }

  console.log("Database seeded successfully with Lab 3 users, tickets, and reference data.");
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
