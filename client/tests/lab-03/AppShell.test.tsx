import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { AppShell } from "../../src/components/AppShell";
import { AuthProvider } from "../../src/context/AuthContext";
import * as api from "../../src/api";

vi.mock("../../src/api", () => ({
  loginApi: vi.fn(),
  logoutApi: vi.fn().mockResolvedValue(undefined),
  fetchCurrentUser: vi.fn(),
}));

describe("UI-03: AppShell Role-Based Navigation & Profile Pill Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Requester navigation links and green role badge", async () => {
    (api.fetchCurrentUser as any).mockResolvedValueOnce({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.a@toktickit.local",
      role: "REQUESTER",
      mustChangePassword: false,
      isActive: true,
    });

    render(
      <AuthProvider>
        <AppShell currentTab="my-tickets" onTabChange={() => {}}>
          <div>Workspace Content</div>
        </AppShell>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Jennifer Anderson/i)).toBeInTheDocument();
      expect(screen.getByText("Requester")).toBeInTheDocument();
      expect(screen.getByText(/My Tickets/i)).toBeInTheDocument();
      expect(screen.getByText(/Create Ticket/i)).toBeInTheDocument();
      expect(screen.queryByText(/Ticket Queue/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/User Management/i)).not.toBeInTheDocument();
    });
  });

  it("renders IT Staff navigation links and blue role badge", async () => {
    (api.fetchCurrentUser as any).mockResolvedValueOnce({
      id: 2,
      name: "Alex Turner",
      email: "alex.t@toktickit.local",
      role: "IT_STAFF",
      mustChangePassword: false,
      isActive: true,
    });

    render(
      <AuthProvider>
        <AppShell currentTab="ticket-queue" onTabChange={() => {}}>
          <div>Workspace Content</div>
        </AppShell>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Alex Turner/i)).toBeInTheDocument();
      expect(screen.getByText("IT Staff")).toBeInTheDocument();
      expect(screen.getByText(/Ticket Queue/i)).toBeInTheDocument();
      expect(screen.queryByText(/Create Ticket/i)).not.toBeInTheDocument();
    });
  });

  it("renders Administrator navigation links and purple role badge", async () => {
    (api.fetchCurrentUser as any).mockResolvedValueOnce({
      id: 3,
      name: "System Administrator",
      email: "admin@toktickit.local",
      role: "ADMINISTRATOR",
      mustChangePassword: false,
      isActive: true,
    });

    render(
      <AuthProvider>
        <AppShell currentTab="user-management" onTabChange={() => {}}>
          <div>Workspace Content</div>
        </AppShell>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/System Administrator/i)).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
  });

  it("opens profile dropdown and executes logout", async () => {
    (api.fetchCurrentUser as any).mockResolvedValueOnce({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.a@toktickit.local",
      role: "REQUESTER",
      mustChangePassword: false,
      isActive: true,
    });

    render(
      <AuthProvider>
        <AppShell currentTab="my-tickets" onTabChange={() => {}}>
          <div>Workspace Content</div>
        </AppShell>
      </AuthProvider>
    );

    const profilePill = await screen.findByRole("button", { name: /User profile menu/i });
    fireEvent.click(profilePill);

    const logoutBtn = await screen.findByText(/Logout/i);
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(api.logoutApi).toHaveBeenCalled();
    });
  });
});
