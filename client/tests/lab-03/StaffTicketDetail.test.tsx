import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail";
import * as api from "../../src/api";

vi.mock("../../src/api", () => ({
  fetchStaffTicketDetail: vi.fn(),
  assignStaffTicket: vi.fn(),
  updateStaffTicketPriority: vi.fn(),
  updateStaffTicketStatus: vi.fn(),
  fetchTicketComments: vi.fn(),
  postTicketComment: vi.fn(),
  fetchInternalNotes: vi.fn(),
  postInternalNote: vi.fn(),
  fetchStaffUsers: vi.fn(),
  fetchTicketAttachments: vi.fn(),
}));

const mockTicket = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "VPN Connection drops frequently",
  description: "Connecting to campus VPN fails every 10 minutes.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "NEW",
  requesterId: 1,
  categoryId: 1,
  relatedSystemId: 1,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  category: { id: 1, name: "Account and Access" },
  relatedSystem: { id: 1, name: "VPN Services" },
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.a@toktickit.local" },
  assignedStaff: null,
};

const mockStaffUsers: api.StaffUser[] = [
  { id: 2, name: "Alex Turner", email: "alex.t@toktickit.local", role: "IT_STAFF" },
  { id: 4, name: "System Administrator", email: "admin@toktickit.local", role: "ADMINISTRATOR" },
];

describe("UI-05: IT Staff Ticket Detail Component Tests (AC-12..15, BR-19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchStaffTicketDetail as any).mockResolvedValue(mockTicket);
    (api.fetchStaffUsers as any).mockResolvedValue(mockStaffUsers);
    (api.fetchTicketComments as any).mockResolvedValue([]);
    (api.fetchInternalNotes as any).mockResolvedValue([]);
    (api.fetchTicketAttachments as any).mockResolvedValue([]);
  });

  it("renders ticket detail header, read-only Requested Priority, and operational controls (AC-12, AC-14)", async () => {
    render(<StaffTicketDetail ticketId={1} currentUserRole="IT_STAFF" currentUserId={2} />);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
      expect(screen.getByText("VPN Connection drops frequently")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /claim ticket/i })).toBeInTheDocument();
    });
  });

  it("executes claim ticket operation for IT Staff (AC-12)", async () => {
    (api.assignStaffTicket as any).mockResolvedValueOnce({
      ...mockTicket,
      assignedStaffId: 2,
      assignedStaff: mockStaffUsers[0],
    });

    render(<StaffTicketDetail ticketId={1} currentUserRole="IT_STAFF" currentUserId={2} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /claim ticket/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /claim ticket/i }));

    await waitFor(() => {
      expect(api.assignStaffTicket).toHaveBeenCalledWith(1, 2);
    });
  });

  it("updates IT Priority via dropdown selection (AC-14)", async () => {
    (api.updateStaffTicketPriority as any).mockResolvedValueOnce({
      ...mockTicket,
      itPriority: "URGENT",
    });

    render(<StaffTicketDetail ticketId={1} currentUserRole="IT_STAFF" currentUserId={2} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/it priority/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/it priority/i), { target: { value: "URGENT" } });

    await waitFor(() => {
      expect(api.updateStaffTicketPriority).toHaveBeenCalledWith(1, "URGENT");
    });
  });

  it("executes valid state-machine status transition from NEW to OPEN (AC-15)", async () => {
    (api.updateStaffTicketStatus as any).mockResolvedValueOnce({
      ...mockTicket,
      currentStatus: "OPEN",
    });

    render(<StaffTicketDetail ticketId={1} currentUserRole="IT_STAFF" currentUserId={2} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/update status/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/update status/i), { target: { value: "OPEN" } });

    const saveStatusBtn = screen.getByRole("button", { name: /save transition to open/i });
    fireEvent.click(saveStatusBtn);

    await waitFor(() => {
      expect(api.updateStaffTicketStatus).toHaveBeenCalledWith(1, "OPEN", undefined);
    });
  });
});
