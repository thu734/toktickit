import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { changedFields, draftFor, validateDraft } from "../../src/components/ActionForm";
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

const viewer = { name: "Current Staff", role: "IT_STAFF" as const };
async function openCreate(role: "IT_STAFF" | "ADMINISTRATOR" = "IT_STAFF") {
  render(<ActionsTaken ticketId={7} ticketStatus="OPEN" viewer={{ ...viewer, role }} />);
  const add = await screen.findByRole("button", { name: "Add Action" });
  await act(async () => { fireEvent.click(add); });
  return screen.getByRole("form", { name: "Create Action" });
}
function enter(label: string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }
async function openEdit(value = action) {
  vi.mocked(api.fetchActions).mockResolvedValue({ actions: [value], workflowRevision: 4 });
  render(<ActionsTaken ticketId={7} ticketStatus="OPEN" viewer={viewer} />);
  const edit = await screen.findByRole("button", { name: value.status === "COMPLETED" ? "Correct completed Action" : "Edit Action" });
  await act(async () => { fireEvent.click(edit); });
}
describe("Actions management", () => {
  it.each(["IT_STAFF", "ADMINISTRATOR"] as const)("allows %s creation with session attribution and the loaded revision", async role => {
    vi.mocked(api.createAction).mockResolvedValue({ action, workflowRevision: 5 });
    await openCreate(role);
    enter("Description", "  Inspect network  ");
    fireEvent.click(screen.getByRole("button", { name: "Create Action" }));
    await waitFor(() => expect(api.createAction).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(api.createAction).mock.calls[0][1];
    expect(payload).toEqual({ description: "Inspect network", result: "", assignedToId: null, followUpRequired: false, followUpNote: "", attachmentNotes: "", workflowRevision: 4, requestKey: expect.any(String) });
    expect(payload).not.toHaveProperty("performedById");
    expect(await screen.findByText("Action saved.")).toBeInTheDocument();
  });
  it("validates required description and conditional follow-up without a request", async () => {
    await openCreate();
    enter("Description", "   ");
    fireEvent.click(screen.getByLabelText("Follow-Up Required"));
    fireEvent.click(screen.getByRole("button", { name: "Create Action" }));
    expect(screen.getByLabelText("Description")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Follow-Up Note")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Description")).toHaveFocus();
    expect(api.createAction).not.toHaveBeenCalled();
  });
  it("assigns an active staff member independently of the creator", async () => {
    vi.mocked(api.fetchStaffUsers).mockResolvedValue([{ id: 9, name: "Other Staff", email: "other@example.test", role: "IT_STAFF" }]);
    vi.mocked(api.updateAction).mockResolvedValue({ action, workflowRevision: 5 });
    await openEdit();
    await screen.findByRole("option", { name: "Other Staff (Staff)" });
    enter("Assigned to", "9");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateAction).toHaveBeenCalledWith(7, 10, { assignedToId: 9, workflowRevision: 4 }));
  });
  it.each(["Complete Action", "Cancel Action"])("requires Result then performs %s", async button => {
    vi.mocked(api.updateAction).mockResolvedValue({ action, workflowRevision: 5 });
    await openEdit();
    fireEvent.click(screen.getByRole("button", { name: button }));
    expect(screen.getByLabelText("Result")).toHaveAttribute("aria-invalid", "true");
    expect(api.updateAction).not.toHaveBeenCalled();
    enter("Result", "Recorded outcome");
    fireEvent.click(screen.getByRole("button", { name: button }));
    await waitFor(() => expect(api.updateAction).toHaveBeenCalledWith(7, 10, { result: "Recorded outcome", status: button === "Complete Action" ? "COMPLETED" : "CANCELLED", workflowRevision: 4 }));
  });
  it("permits only approved completed corrections", async () => {
    vi.mocked(api.updateAction).mockResolvedValue({ action, workflowRevision: 5 });
    await openEdit({ ...action, status: "COMPLETED", result: "Fixed" });
    expect(screen.getByLabelText("Description")).toHaveAttribute("readonly");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete Action" })).not.toBeInTheDocument();
    enter("Attachment Notes", "Corrected reference");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateAction).toHaveBeenCalledWith(7, 10, { attachmentNotes: "Corrected reference", workflowRevision: 4 }));
  });
  it.each(["RESOLVED", "CLOSED", "CANCELLED"])("hides writes and shows guidance on a %s parent", async status => {
    render(<ActionsTaken ticketId={7} ticketStatus={status} viewer={viewer} />);
    await screen.findByText("Inspect workstation");
    expect(screen.queryByRole("button", { name: /Add Action|Edit Action|Correct completed Action/ })).not.toBeInTheDocument();
    if (status === "CANCELLED") {
      expect(screen.getByText("This Ticket is cancelled. Actions are read-only.")).toBeInTheDocument();
    } else {
      expect(screen.getByText("Reopen this Ticket before adding or correcting Actions.")).toBeInTheDocument();
    }
  });
  it("does not offer edits on cancelled Actions", async () => {
    vi.mocked(api.fetchActions).mockResolvedValue({ actions: [{ ...action, status: "CANCELLED", result: "Not needed" }], workflowRevision: 4 });
    render(<ActionsTaken ticketId={7} ticketStatus="OPEN" viewer={viewer} />);
    await screen.findByText("Cancelled Actions cannot be edited.");
    expect(screen.queryByRole("button", { name: "Edit Action" })).not.toBeInTheDocument();
  });
  it("distinguishes loading, failed and empty staff lookup and retains input", async () => {
    let reject!: (reason: unknown) => void;
    vi.mocked(api.fetchStaffUsers).mockReturnValueOnce(new Promise((_, r) => { reject = r; }));
    await openCreate();
    expect(screen.getByText("Loading assignees…")).toBeInTheDocument();
    expect(screen.getByLabelText("Assigned to")).toBeDisabled();
    enter("Description", "Keep this draft");
    await act(async () => reject(new Error("Offline")));
    expect(screen.queryByText(/No eligible assignees/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry assignees" }));
    expect(await screen.findByText(/No eligible assignees available/)).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("Keep this draft");
    expect(screen.getByLabelText("Assigned to")).toHaveValue("");
  });
  it("retains the draft after the server rejects an inactive assignee", async () => {
    vi.mocked(api.createAction).mockRejectedValue({ status: 400, code: "INVALID_ASSIGNEE", message: "Assignee must be active." });
    await openCreate(); enter("Description", "Keep this draft");
    fireEvent.click(screen.getByRole("button", { name: "Create Action" }));
    expect(await screen.findByText("Assignee must be active.")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("Keep this draft");
  });
  it("blocks double clicks and replays the exact original creation after an ambiguous failure", async () => {
    let reject!: (error: unknown) => void;
    vi.mocked(api.createAction).mockReturnValueOnce(new Promise((_, r) => { reject = r; })).mockResolvedValue({ action, workflowRevision: 5 });
    await openCreate(); enter("Description", "One operation");
    const button = screen.getByRole("button", { name: "Create Action" });
    fireEvent.click(button); fireEvent.click(button);
    expect(api.createAction).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(api.createAction).mock.calls[0][1];
    await act(async () => reject(new Error("Connection lost")));
    expect(screen.getByLabelText("Description")).toHaveValue("One operation");
    expect(screen.getByLabelText("Description")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard draft" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry same create request" }));
    await waitFor(() => expect(api.createAction).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.createAction).mock.calls[1][1]).toEqual(payload);
    expect(await screen.findByText("Action saved.")).toBeInTheDocument();
  });
  it.each(["STALE_REVISION", "REQUEST_KEY_REUSED"])("preserves a draft on %s and requires refresh and review", async code => {
    vi.mocked(api.createAction).mockRejectedValueOnce({ status: 409, code }).mockResolvedValue({ action, workflowRevision: 10 });
    await openCreate(); enter("Description", "Retained");
    fireEvent.click(screen.getByRole("button", { name: "Create Action" }));
    vi.mocked(api.fetchActions).mockResolvedValue({ actions: [action], workflowRevision: 9 });
    fireEvent.click(await screen.findByRole("button", { name: "Refresh and review" }));
    expect(await screen.findByRole("button", { name: "I have reviewed the latest Actions" })).toBeInTheDocument();
    expect(api.createAction).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Description")).toHaveValue("Retained");
    fireEvent.click(screen.getByRole("button", { name: "I have reviewed the latest Actions" }));
    expect(screen.getByRole("button", { name: "Create Action" })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Create Action" }));
    await waitFor(() => expect(api.createAction).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.createAction).mock.calls[1][1].workflowRevision).toBe(9);
  });
  it("completes the first conflict refresh when the parent publishes the new Ticket revision", async () => {
    vi.mocked(api.updateAction).mockRejectedValueOnce({ status: 409, code: "STALE_REVISION" });
    let finishRefresh!: () => void;
    function TicketHarness() {
      const [revision, setRevision] = useState(4);
      return <ActionsTaken ticketId={7} ticketStatus="OPEN" viewer={viewer} workflowRevision={revision}
        onRefreshTicket={async () => {
          setRevision(5);
          await new Promise<void>(resolve => { finishRefresh = resolve; });
        }} />;
    }
    render(<TicketHarness />);
    const editButton = await screen.findByRole("button", { name: "Edit Action" });
    await act(async () => { fireEvent.click(editButton); });
    enter("Result", "Retain this resolution draft");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const refresh = await screen.findByRole("button", { name: "Refresh and review" });
    vi.mocked(api.fetchActions).mockResolvedValue({ actions: [{ ...action, attachmentNotes: "Newer work" }], workflowRevision: 5 });
    await act(async () => { fireEvent.click(refresh); });
    await act(async () => { finishRefresh(); });
    const review = await screen.findByRole("button", { name: "I have reviewed the latest Actions" });
    expect(review).toBeEnabled();
    expect(screen.getByLabelText("Result")).toHaveValue("Retain this resolution draft");
    expect(api.updateAction).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.click(review); });
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });
  it("discards draft and returns focus to the section heading", async () => {
    await openCreate();
    enter("Description", "Discard me");
    const discard = screen.getByRole("button", { name: "Discard draft" });
    fireEvent.click(discard);
    expect(screen.queryByRole("form", { name: "Create Action" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Actions Taken" })).toHaveFocus();
  });
  it("shows error when attempting to save with no changes", async () => {
    await openEdit();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("No changes to save.")).toBeInTheDocument();
    expect(api.updateAction).not.toHaveBeenCalled();
  });
  it("detects concurrent lifecycle changes and blocks saving the retained draft", async () => {
    vi.mocked(api.updateAction).mockRejectedValueOnce({ status: 409, code: "STALE_REVISION" });
    await openEdit();
    enter("Description", "Changed description");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/Newer work or a conflicting request exists/)).toBeInTheDocument();
    vi.mocked(api.fetchActions).mockResolvedValue({
      actions: [{ ...action, status: "COMPLETED", result: "Completed by another staff" }],
      workflowRevision: 5,
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh and review" }));
    expect(await screen.findByText(/This Action's status changed. Your draft is retained for reference/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I have reviewed the latest Actions" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});

describe("Action field boundaries", () => {
  it.each([["description", 2000], ["result", 2000], ["followUpNote", 1000], ["attachmentNotes", 1000]] as const)("checks the exact %s boundary", (field, limit) => {
    const draft = { ...draftFor(action), [field]: "x".repeat(limit) };
    expect(validateDraft(draft, false)[field]).toBeUndefined();
    expect(validateDraft({ ...draft, [field]: "x".repeat(limit + 1) }, false)[field]).toBeTruthy();
  });
  it("never includes protected or completed-forbidden fields in a correction", () => {
    const completed = { ...action, status: "COMPLETED" as const, result: "Done" };
    expect(changedFields({ ...draftFor(completed), description: "Forged change", assignedToId: 99, result: "Correction" }, completed)).toEqual({ result: "Correction" });
  });
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
    expect(screen.queryByText(/Shared with the Ticket Requester/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Read-only Actions/i)).not.toBeInTheDocument();
  });
  it.each(["IT_STAFF", "ADMINISTRATOR"] as const)("shows the concise shared-content reminder in %s view", async role => {
    render(<ActionsTaken ticketId={7} ticketStatus="OPEN" viewer={{ ...viewer, role }} />);
    expect(await screen.findByText("Actions Taken are shared with the Requester. Private information belongs in Internal Notes.")).toBeInTheDocument();
  });
  it("distinguishes loading from empty", async () => {
    vi.mocked(api.fetchActions).mockResolvedValue({ actions: [], workflowRevision: 0 });
    render(<ActionsTaken ticketId={7} ticketStatus="OPEN" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Actions");
    expect(await screen.findByText("No Actions Taken yet.")).toBeInTheDocument();
  });
  it.each([401, 403, 404, 500])("shows a safe %s failure rather than empty data and retries", async status => {
    vi.mocked(api.fetchActions).mockRejectedValueOnce({ status, message: "Service unavailable" });
    render(<ActionsTaken ticketId={7} ticketStatus="OPEN" />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("No Actions Taken yet.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry loading Actions" }));
    await waitFor(() => expect(screen.getByText("Inspect workstation")).toBeInTheDocument());
  });
});
