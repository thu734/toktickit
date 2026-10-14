import { it, expect } from "vitest";
import { execFileSync } from "child_process";
import { getPrisma } from "../../src/prisma.js";
import { resolveTestDatabaseUrl } from "../testDatabase.js";

it("seeds comment/note examples idempotently and preserves unrelated conversation records", async () => {
  const seed = () => execFileSync("npm", ["run", "prisma:seed"], {
    env: { ...process.env, DATABASE_URL: resolveTestDatabaseUrl() }, stdio: "pipe",
  });
  seed();
  const prisma = getPrisma();
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2026-000001" } });
  const author = await prisma.user.findUniqueOrThrow({ where: { email: "alex.t@toktickit.local" } });
  const comments = await prisma.comment.findMany({ where: { ticketId: ticket.id, content: "Please check whether the VPN stays connected after restarting the client." } });
  const notes = await prisma.internalNote.findMany({ where: { ticketId: ticket.id, content: "Example internal note: review VPN gateway connection logs during diagnostics." } });
  expect(comments).toHaveLength(1);
  expect(notes).toHaveLength(1);
  const existingComments = await prisma.comment.findMany({ where: { ticketId: ticket.id } });
  const existingNotes = await prisma.internalNote.findMany({ where: { ticketId: ticket.id } });
  const extraComment = await prisma.comment.create({ data: {
    ticketId: ticket.id, authorId: author.id, content: "An existing conversation must survive reseeding.",
  } });
  const extraNote = await prisma.internalNote.create({ data: {
    ticketId: ticket.id, authorId: author.id, content: "Existing diagnostic findings must survive reseeding.",
  } });
  try {
    seed();
    expect(await prisma.comment.findMany({ where: { ticketId: ticket.id }, orderBy: { id: "asc" } }))
      .toEqual([...existingComments, extraComment].sort((a, b) => a.id - b.id));
    expect(await prisma.internalNote.findMany({ where: { ticketId: ticket.id }, orderBy: { id: "asc" } }))
      .toEqual([...existingNotes, extraNote].sort((a, b) => a.id - b.id));
  } finally {
    await prisma.comment.delete({ where: { id: extraComment.id } });
    await prisma.internalNote.delete({ where: { id: extraNote.id } });
  }
});
