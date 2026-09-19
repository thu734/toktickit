import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App Header & Brand Baseline (Lab 1 / Lab 2 Integration)", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.a@toktickit.local",
      role: "REQUESTER",
      mustChangePassword: false,
      isActive: true,
    });
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({ items: [], pagination: { page: 1, limit: 10, totalPages: 0, totalItems: 0 } });
  });

  it("renders the Login screen when user is unauthenticated", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(null);
    render(<App />);
    expect(await screen.findByText(/Sign in to your account/i)).toBeInTheDocument();
  });

  it("renders the TokTickIT brand logo and heading when authenticated", async () => {
    render(<App />);
    expect(await screen.findByRole("link", { name: /TokTickIT/i })).toBeInTheDocument();
    const createBtns = await screen.findAllByRole("button", { name: /Create Ticket/i });
    expect(createBtns.length).toBeGreaterThan(0);
    expect(await screen.findByRole("button", { name: /My Tickets/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /User profile menu/i })).toBeInTheDocument();
  });
});
