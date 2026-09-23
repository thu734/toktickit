import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { StaffTicketQueue } from "../../src/components/StaffTicketQueue";
import * as api from "../../src/api";

vi.mock("../../src/api", () => ({
  fetchStaffTickets: vi.fn(),
  fetchCategories: vi.fn(),
}));

const mockTicketsData: api.PaginatedTicketsResponse = {
  items: [
    {
      id: 1,
      ticketNumber: "TKT-2026-000001",
      summary: "VPN Connection drops frequently",
      description: "Connecting to campus VPN fails every 10 minutes.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "OPEN",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
      category: { id: 1, name: "Account and Access" },
      relatedSystem: { id: 1, name: "VPN Services" },
      requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.a@toktickit.local" },
      assignedStaff: { id: 2, name: "Alex Turner", email: "alex.t@toktickit.local" },
    },
    {
      id: 2,
      ticketNumber: "TKT-2026-000002",
      summary: "Printer toner empty",
      description: "2nd floor printer needs new black toner.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "NEW",
      requesterId: 3,
      categoryId: 2,
      relatedSystemId: 2,
      createdAt: "2026-01-02T10:00:00.000Z",
      updatedAt: "2026-01-02T10:00:00.000Z",
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 2, name: "Printers" },
      requester: { id: 3, name: "Sarah Jenkins", email: "sarah.j@toktickit.local" },
      assignedStaff: undefined,
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 2,
    totalPages: 1,
  },
};

describe("UI-04: IT Staff Ticket Queue Component Tests (AC-10, AC-11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchCategories as any).mockResolvedValue([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
    ]);
  });

  it("renders queue table, search bar, filters, and ticket items (AC-10)", async () => {
    (api.fetchStaffTickets as any).mockResolvedValueOnce(mockTicketsData);

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByText("IT Support Ticket Queue")).toBeInTheDocument();
      expect(screen.getAllByText("TKT-2026-000001")[0]).toBeInTheDocument();
      expect(screen.getAllByText("VPN Connection drops frequently")[0]).toBeInTheDocument();
      expect(screen.getAllByText("TKT-2026-000002")[0]).toBeInTheDocument();
    });
  });

  it("triggers queue search and filter change callbacks (AC-11)", async () => {
    (api.fetchStaffTickets as any).mockResolvedValue(mockTicketsData);

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ticket #, summary/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/ticket #, summary/i);
    fireEvent.change(searchInput, { target: { value: "VPN" } });

    const searchBtn = screen.getByRole("button", { name: /^search$/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalled();
    });
  });

  it("displays no-results state and clear filters action when queue is empty (AC-11)", async () => {
    (api.fetchStaffTickets as any).mockResolvedValue(mockTicketsData);

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ticket #, summary/i)).toBeInTheDocument();
    });

    (api.fetchStaffTickets as any).mockResolvedValueOnce({
      items: [],
      pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
    });

    const searchInput = screen.getByPlaceholderText(/ticket #, summary/i);
    fireEvent.change(searchInput, { target: { value: "NonExistent" } });

    const searchBtn = screen.getByRole("button", { name: /^search$/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText("No tickets match your filter criteria.")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /clear filters/i })[0]).toBeInTheDocument();
    });
  });

  it("navigates to ticket detail on clicking Open Detail button (AC-10)", async () => {
    (api.fetchStaffTickets as any).mockResolvedValueOnce(mockTicketsData);
    const onOpenTicketMock = vi.fn();

    render(<StaffTicketQueue onOpenTicket={onOpenTicketMock} />);

    await waitFor(() => {
      expect(screen.getAllByText("Open Detail")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Open Detail")[0]);
    expect(onOpenTicketMock).toHaveBeenCalledWith(1);
  });
});
