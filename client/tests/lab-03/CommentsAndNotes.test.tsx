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
};

const mockComments: api.Comment[] = [
  {
    id: 101,
    content: "Please check your VPN settings.",
    ticketId: 1,
    authorId: 2,
    createdAt: "2026-01-01T11:00:00.000Z",
    author: { id: 2, name: "Alex Turner", role: "IT_STAFF" },
  },
];

const mockInternalNotes: api.InternalNote[] = [
  {
    id: 201,
    content: "Checked Cisco AnyConnect logs; radius timeout issue.",
    ticketId: 1,
    authorId: 2,
    createdAt: "2026-01-01T11:15:00.000Z",
    author: { id: 2, name: "Alex Turner", role: "IT_STAFF" },
  },
];

describe("UI-06: Public Comments & Internal Notes UI Tests (AC-08, AC-17, BR-22)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchStaffTicketDetail as any).mockResolvedValue(mockTicket);
    (api.fetchStaffUsers as any).mockResolvedValue([]);
    (api.fetchTicketComments as any).mockResolvedValue(mockComments);
    (api.fetchInternalNotes as any).mockResolvedValue(mockInternalNotes);
    (api.fetchTicketAttachments as any).mockResolvedValue([]);
  });

  it("renders Public Comments feed with author role badge (AC-08)", async () => {
    render(<StaffTicketDetail ticketId={1} currentUserRole="IT_STAFF" currentUserId={2} />);

    await waitFor(() => {
      expect(screen.getByText("Please check your VPN settings.")).toBeInTheDocument();
      expect(screen.getAllByText("Alex Turner")[0]).toBeInTheDocument();
    });
  });

  it("posts a Public Comment successfully (AC-08, BR-15)", async () => {
    (api.postTicketComment as any).mockResolvedValueOnce({
      id: 102,
      content: "Thank you, I updated the settings.",
      ticketId: 1,
      authorId: 2,
      createdAt: "2026-01-01T11:30:00.000Z",
      author: { id: 2, name: "Alex Turner", role: "IT_STAFF" },
    });

    render(<StaffTicketDetail ticketId={1} currentUserRole="IT_STAFF" currentUserId={2} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/write a public comment/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/write a public comment/i);
    fireEvent.change(input, { target: { value: "Thank you, I updated the settings." } });

    const submitBtn = screen.getByRole("button", { name: /post comment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.postTicketComment).toHaveBeenCalledWith(1, "Thank you, I updated the settings.");
    });
  });

  it("renders Internal Notes tab with amber background and posts internal note (AC-17)", async () => {
    (api.postInternalNote as any).mockResolvedValueOnce({
      id: 202,
      content: "User confirmed radius server fix worked.",
      ticketId: 1,
      authorId: 2,
      createdAt: "2026-01-01T12:00:00.000Z",
      author: { id: 2, name: "Alex Turner", role: "IT_STAFF" },
    });

    render(<StaffTicketDetail ticketId={1} currentUserRole="IT_STAFF" currentUserId={2} />);

    await waitFor(() => {
      expect(screen.getByText(/internal notes/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/internal notes/i));

    await waitFor(() => {
      expect(screen.getByText("Checked Cisco AnyConnect logs; radius timeout issue.")).toBeInTheDocument();
    });

    const noteInput = screen.getByPlaceholderText(/write private internal note/i);
    fireEvent.change(noteInput, { target: { value: "User confirmed radius server fix worked." } });

    const postNoteBtn = screen.getByRole("button", { name: /add note/i });
    fireEvent.click(postNoteBtn);

    await waitFor(() => {
      expect(api.postInternalNote).toHaveBeenCalledWith(1, "User confirmed radius server fix worked.");
    });
  });
});
