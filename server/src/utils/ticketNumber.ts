import type { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";

/**
 * Format a sequence number into official Ticket Number string format:
 * TKT-YYYY-XXXXXX (e.g. TKT-2026-000001)
 */
export function formatTicketNumber(year: number, sequence: number): string {
  const paddedSequence = String(sequence).padStart(6, "0");
  return `TKT-${year}-${paddedSequence}`;
}

/**
 * Generate the next unique Ticket Number for the current year.
 */
export async function generateNextTicketNumber(year?: number, client: Pick<Prisma.TransactionClient, "ticket"> = getPrisma()): Promise<string> {
  const currentYear = year ?? new Date().getFullYear();
  const yearPrefix = `TKT-${currentYear}-`;

  // Find the latest ticket created in the current year
  const latestTicket = await client.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: yearPrefix,
      },
    },
    orderBy: {
      id: "desc",
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextSequence = 1;

  if (latestTicket && latestTicket.ticketNumber) {
    const parts = latestTicket.ticketNumber.split("-");
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }

  return formatTicketNumber(currentYear, nextSequence);
}
