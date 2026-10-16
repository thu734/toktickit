import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ActionsTaken } from "../../src/components/ActionsTaken";
import * as api from "../../src/api";

vi.mock("../../src/api", () => ({ fetchActions: vi.fn(), fetchStaffUsers: vi.fn(), createAction: vi.fn(), updateAction: vi.fn() }));
export const action: api.ActionTaken = {
  id: 10, ticketId: 7, performedById: 2, assignedToId: null, status: "PLANNED",
  description: "Inspect workstation", result: null, followUpRequired: false, followUpNote: null, attachmentNotes: "Existing diagnostic file",
  createdAt: "2026-01-01T10:00:00Z", updatedAt: "2026-01-01T10:00:00Z",
  performedBy: { id: 2, name: "Staff Creator", email: "staff@example.test", role: "IT_STAFF" }, assignedTo: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.fetchActions).mockResolvedValue({ actions: [action], workflowRevision: 4 });
  vi.mocked(api.fetchStaffUsers).mockResolvedValue([]);
});
describe("Actions Taken list", () => {
  it("shows all shared fields in API order and no Requester mutations", async () => {
    vi.mocked(api.fetchActions).mockResolvedValue({ actions: [action, { ...action, id: 11, status: "CANCELLED", result: "Not needed" }], workflowRevision: 4 });
    render(<ActionsTaken ticketId={7} ticketStatus="OPEN" />);
    expect(await screen.findAllByText("Inspect workstation")).toHaveLength(2);
    expect(screen.getAllByRole("article").map(e => e.getAttribute("aria-label"))).toEqual(["Action 10", "Action 11"]);
    expect(screen.getAllByText("Staff Creator")).toHaveLength(2);
    expect(screen.getAllByText("Existing diagnostic file")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /create|edit|complete|cancel/i })).not.toBeInTheDocument();
    expect(api.fetchStaffUsers).not.toHaveBeenCalled();
  });
  it("distinguishes loading from empty", async () => {
    vi.mocked(api.fetchActions).mockResolvedValue({ actions: [], workflowRevision: 0 });
    render(<ActionsTaken ticketId={7} ticketStatus="OPEN" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Actions");
    expect(await screen.findByText("No Actions recorded.")).toBeInTheDocument();
  });
  it.each([401, 403, 404, 500])("shows a safe %s failure rather than empty data and retries", async status => {
    vi.mocked(api.fetchActions).mockRejectedValueOnce({ status, message: "Service unavailable" });
    render(<ActionsTaken ticketId={7} ticketStatus="OPEN" />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("No Actions recorded.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry Actions" }));
    await waitFor(() => expect(screen.getByText("Inspect workstation")).toBeInTheDocument());
  });
});
