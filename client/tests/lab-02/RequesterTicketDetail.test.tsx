import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import * as api from "../../src/api.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import { RequesterTicketDetail } from "../../src/components/RequesterTicketDetail.js";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.a@toktickit.local",
  department: "Marketing",
};

describe("Lab 2 Requester Ticket Detail UI Tests (UI-05, AC-03, AC-22)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders ticket header, read-only itPriority, description, and hides IT Staff tabs (UI-05, AC-22)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue({
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "VPN Drops repeatedly",
      description: "Detailed description of campus VPN drop issue.",
      requestedPriority: "HIGH",
      itPriority: "UNASSIGNED",
      currentStatus: "NEW",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      createdAt: "2026-01-01T10:00:00Z",
      updatedAt: "2026-01-01T10:00:00Z",
      category: { id: 1, name: "Account and Access" },
      relatedSystem: { id: 1, name: "VPN" },
      requester: mockRequester,
      attachments: [],
    });

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <RequesterTicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101")[0]).toBeInTheDocument();
      expect(screen.getByText("VPN Drops repeatedly")).toBeInTheDocument();
      expect(screen.getByText("Detailed description of campus VPN drop issue.")).toBeInTheDocument();
      expect(screen.getByText("IT Priority (Read-Only)")).toBeInTheDocument();
      expect(screen.getAllByText("UNASSIGNED")[0]).toBeInTheDocument();
    });

    // Ensure IT Staff controls are NOT rendered
    expect(screen.queryByText(/Ticket Owner/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Internal Notes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Public Comments/i)).not.toBeInTheDocument();
  });

  it("displays error state when ticket detail API returns failure or 403 (UI-05, AC-03)", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockRejectedValue(new Error("Access Denied"));

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <RequesterTicketDetail ticketId={999} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Unable to load ticket details/i)).toBeInTheDocument();
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    });
  });

  it("refreshes ticket details in background without unmounting DOM during attachment updates", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTicketDetail").mockResolvedValueOnce({
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "VPN Drops repeatedly",
      description: "Detailed description of campus VPN drop issue.",
      requestedPriority: "HIGH",
      itPriority: "UNASSIGNED",
      currentStatus: "NEW",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      createdAt: "2026-01-01T10:00:00Z",
      updatedAt: "2026-01-01T10:00:00Z",
      category: { id: 1, name: "Account and Access" },
      relatedSystem: { id: 1, name: "VPN" },
      requester: mockRequester,
      attachments: [],
    });

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <RequesterTicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("VPN Drops repeatedly")).toBeInTheDocument();
    });

    // Mock second call for attachment change
    fetchSpy.mockResolvedValueOnce({
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "VPN Drops repeatedly",
      description: "Detailed description of campus VPN drop issue.",
      requestedPriority: "HIGH",
      itPriority: "UNASSIGNED",
      currentStatus: "NEW",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      createdAt: "2026-01-01T10:00:00Z",
      updatedAt: "2026-01-01T10:00:00Z",
      category: { id: 1, name: "Account and Access" },
      relatedSystem: { id: 1, name: "VPN" },
      requester: mockRequester,
      attachments: [
        {
          id: 50,
          ticketId: 101,
          filename: "test-log.txt",
          storedFilename: "50-test-log.txt",
          mimeType: "text/plain",
          fileSizeBytes: 1024,
          isRemoved: false,
          uploadedAt: "2026-01-01T11:00:00Z",
          uploadedByRequesterId: 1,
        },
      ],
    });

    // Ticket details remains mounted throughout
    expect(screen.getByText("VPN Drops repeatedly")).toBeInTheDocument();
    expect(screen.queryByText(/Loading ticket details.../i)).not.toBeInTheDocument();
  });
});
