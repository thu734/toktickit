import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import * as api from "../../src/api.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import { MyTicketsList } from "../../src/components/MyTicketsList.js";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.a@toktickit.local",
  department: "Marketing",
};

describe("Lab 2 My Tickets List UI Tests (UI-03, UI-04, UI-09, UI-10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
    ]);
  });

  it("renders true empty state card when active requester has 0 tickets (UI-09, AC-15)", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
    });

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <MyTicketsList />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No Tickets Yet/i)).toBeInTheDocument();
      expect(screen.getByText(/You have not submitted any IT tickets/i)).toBeInTheDocument();
    });
  });

  it("renders no-results state card with Clear Filters button when search/filter matches 0 tickets (UI-10, AC-16)", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
    });

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <MyTicketsList />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search ticket #, summary.../i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Search ticket #, summary.../i), {
      target: { value: "NonExistentSearchQuery" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() => {
      expect(screen.getByText(/No Tickets Found/i)).toBeInTheDocument();
      expect(screen.getByText(/No tickets match your search or filter criteria/i)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Clear Filters/i })[0]).toBeInTheDocument();
    });
  });

  it("fetches tickets and renders desktop table rows and status badges (UI-04, AC-09)", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      items: [
        {
          id: 1,
          ticketNumber: "TKT-2026-000001",
          summary: "VPN Connection drops frequently",
          description: "Connecting to campus VPN fails every 10 minutes.",
          requestedPriority: "HIGH",
          itPriority: "UNASSIGNED",
          currentStatus: "NEW",
          requesterId: 1,
          categoryId: 1,
          relatedSystemId: 1,
          createdAt: "2026-01-01T10:00:00Z",
          updatedAt: "2026-01-01T10:00:00Z",
          category: { id: 1, name: "Account and Access" },
          relatedSystem: { id: 1, name: "Email" },
        },
      ],
      pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    });

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <MyTicketsList />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000001")[0]).toBeInTheDocument();
      expect(screen.getAllByText("VPN Connection drops frequently")[0]).toBeInTheDocument();
      expect(screen.getAllByText("NEW")[0]).toBeInTheDocument();
      expect(screen.getAllByText("HIGH")[0]).toBeInTheDocument();
    });
  });

  it("reloads ticket list when requester identity is switched (UI-03, AC-12)", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
    });

    const { rerender } = render(
      <RequesterProvider initialRequester={mockRequester}>
        <MyTicketsList />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.anything(), 1);
    });

    const newRequester = { ...mockRequester, id: 2, name: "Michael Brown" };

    rerender(
      <RequesterProvider initialRequester={newRequester}>
        <MyTicketsList />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.anything(), 2);
    });
  });
});
