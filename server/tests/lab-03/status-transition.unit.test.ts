import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import { isValidStatusTransition } from "../../src/utils/statusTransition.js";

describe("UNIT-01: Ticket Status State Machine Validator (BR-14)", () => {
  it("should allow valid transitions from NEW", () => {
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.OPEN)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CANCELLED)).toBe(true);
  });

  it("should reject invalid transitions from NEW", () => {
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.RESOLVED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CLOSED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.REOPENED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.WAITING_FOR_REQUESTER)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.NEW)).toBe(false);
  });

  it("should allow valid transitions from OPEN", () => {
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.CANCELLED)).toBe(true);
  });

  it("should reject invalid transitions from OPEN", () => {
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.REOPENED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.CLOSED)).toBe(false);
  });

  it("should allow valid transitions from IN_PROGRESS", () => {
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED)).toBe(true);
  });

  it("should reject invalid transitions from IN_PROGRESS", () => {
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.OPEN)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.REOPENED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED)).toBe(false);
  });

  it("should allow valid transitions from WAITING_FOR_REQUESTER", () => {
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED)).toBe(true);
  });

  it("should reject invalid transitions from WAITING_FOR_REQUESTER", () => {
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.OPEN)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.REOPENED)).toBe(false);
  });

  it("should allow valid transitions from RESOLVED", () => {
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED)).toBe(true);
  });

  it("should reject invalid transitions from RESOLVED", () => {
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.OPEN)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.WAITING_FOR_REQUESTER)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CANCELLED)).toBe(false);
  });

  it("should allow valid transitions from CLOSED", () => {
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.REOPENED)).toBe(true);
  });

  it("should reject invalid transitions from CLOSED", () => {
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.OPEN)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.WAITING_FOR_REQUESTER)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.RESOLVED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.CANCELLED)).toBe(false);
  });

  it("should allow valid transitions from REOPENED", () => {
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.CANCELLED)).toBe(true);
  });

  it("should reject invalid transitions from REOPENED", () => {
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.OPEN)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.CLOSED)).toBe(false);
  });

  it("should reject all transitions from CANCELLED (terminal state)", () => {
    Object.values(TicketStatus).forEach((status) => {
      expect(isValidStatusTransition(TicketStatus.CANCELLED, status)).toBe(false);
    });
  });
});
