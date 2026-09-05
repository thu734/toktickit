import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import { CreateTicketForm } from "../../src/components/CreateTicketForm.js";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.a@toktickit.local",
  department: "Marketing",
};

describe("Lab 2 Development Requester Selection & Exclusion UI (UI-01, UI-07)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Development Requester Selection screen when no identity is selected (UI-01)", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.a@toktickit.local", department: "Marketing" },
      { id: 2, name: "Michael Brown", email: "michael.b@toktickit.local", department: "IT Support" },
    ]);

    render(
      <RequesterProvider>
        <App />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Select Development Requester/i)).toBeInTheDocument();
      expect(screen.getByText(/Only active development requesters are shown/i)).toBeInTheDocument();
      expect(screen.getByText(/Authentication coming in Lab 3/i)).toBeInTheDocument();
    });
  });

  it("excludes inactive requesters from the selector dropdown (UI-07)", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.a@toktickit.local", department: "Marketing" },
      { id: 2, name: "Michael Brown", email: "michael.b@toktickit.local", department: "IT Support" },
    ]);

    render(
      <RequesterProvider>
        <App />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Jennifer Anderson" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Michael Brown" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("option", { name: "Robert Smith" })).not.toBeInTheDocument();
  });
});

describe("Lab 2 Create Ticket Form Validation & Submission UI (UI-02, UI-08, UI-STYLE-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
    ]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([
      { id: 1, name: "Email" },
      { id: 2, name: "Campus Wi-Fi" },
    ]);
  });

  it("renders Create Ticket form with Zen Green styles and system generated read-only fields (UI-STYLE-01)", async () => {
    render(
      <RequesterProvider initialRequester={mockRequester}>
        <CreateTicketForm />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Create IT Support Ticket/i)).toBeInTheDocument();
    });

    const ticketNumInput = screen.getByDisplayValue("TKT-YYYY-XXXXXX");
    expect(ticketNumInput).toBeInTheDocument();
    expect(ticketNumInput).toHaveAttribute("readonly");

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    expect(submitBtn).toBeInTheDocument();
  });

  it("validates field lengths and retains form data on API failure (UI-02, AC-11, AC-23)", async () => {
    render(
      <RequesterProvider initialRequester={mockRequester}>
        <CreateTicketForm />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Ticket Summary/i)).toBeInTheDocument();
    });

    // Fill in short summary (< 5 chars)
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), {
      target: { value: "Tiny" },
    });
    fireEvent.change(screen.getByLabelText(/Detailed Description/i), {
      target: { value: "Too short" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/Summary must be between 5 and 150 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Description must be between 10 and 3000 characters/i)).toBeInTheDocument();
    });

    // Verify form retention (AC-11)
    expect(screen.getByLabelText(/Ticket Summary/i)).toHaveValue("Tiny");
    expect(screen.getByLabelText(/Detailed Description/i)).toHaveValue("Too short");
  });

  it("shows busy state and prevents duplicate submission on submit (UI-08, BR-13, AC-14)", async () => {
    let resolveCreate: (val: any) => void = () => {};
    const createPromise = new Promise((res) => {
      resolveCreate = res;
    });

    vi.spyOn(api, "createTicket").mockImplementation(() => createPromise as any);

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <CreateTicketForm />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Ticket Summary/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), {
      target: { value: "Valid Summary for Ticket" },
    });
    fireEvent.change(screen.getByLabelText(/Detailed Description/i), {
      target: { value: "Valid Detailed Description for Ticket Submission" },
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Verify button busy state (BR-13)
    await waitFor(() => {
      expect(screen.getByText(/Submitting.../i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });

    // Attempt second click while busy (BR-13 lock)
    fireEvent.click(submitBtn);
    expect(api.createTicket).toHaveBeenCalledTimes(1);

    // Resolve submission
    resolveCreate({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      summary: "Valid Summary for Ticket",
      currentStatus: "NEW",
      itPriority: "UNASSIGNED",
    });

    await waitFor(() => {
      expect(screen.getByText(/Ticket Created Successfully!/i)).toBeInTheDocument();
      expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
    });
  });
});
