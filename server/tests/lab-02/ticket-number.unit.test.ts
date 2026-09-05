import { describe, it, expect } from "vitest";
import { formatTicketNumber } from "../../src/utils/ticketNumber.js";

describe("Ticket Number Generator Unit Test (UNIT-01)", () => {
  it("formatTicketNumber returns TKT-YYYY-XXXXXX with correct year and sequence (UNIT-01)", () => {
    const ticketNum1 = formatTicketNumber(2026, 1);
    expect(ticketNum1).toBe("TKT-2026-000001");

    const ticketNum42 = formatTicketNumber(2026, 42);
    expect(ticketNum42).toBe("TKT-2026-000042");

    const ticketNum999999 = formatTicketNumber(2025, 999999);
    expect(ticketNum999999).toBe("TKT-2025-999999");
  });
});
