import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { UserManagement } from "../../src/components/UserManagement";
import * as api from "../../src/api";

vi.mock("../../src/api", () => ({
  fetchAdminUsers: vi.fn(),
  createAdminUser: vi.fn(),
  updateAdminUser: vi.fn(),
  resetAdminUserPassword: vi.fn(),
}));

const mockUsers: api.AdminUser[] = [
  {
    id: 1,
    name: "System Administrator",
    email: "admin@toktickit.local",
    role: "ADMINISTRATOR",
    mustChangePassword: false,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Alex Turner",
    email: "alex.t@toktickit.local",
    role: "IT_STAFF",
    mustChangePassword: false,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 3,
    name: "Jennifer Anderson",
    email: "jennifer.a@toktickit.local",
    role: "REQUESTER",
    mustChangePassword: false,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("UI-07: Admin User Management Screen & Modals Tests (AC-18..24)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user table, search input, role filter, and user badges (AC-18, AC-19)", async () => {
    (api.fetchAdminUsers as any).mockResolvedValueOnce(mockUsers);

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
      expect(screen.getAllByText("System Administrator")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Alex Turner")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Jennifer Anderson")[0]).toBeInTheDocument();
    });
  });

  it("opens Create User modal and submits valid new user payload (AC-20)", async () => {
    (api.fetchAdminUsers as any).mockResolvedValue(mockUsers);
    (api.createAdminUser as any).mockResolvedValueOnce({
      id: 4,
      name: "New User",
      email: "new.user@toktickit.local",
      role: "REQUESTER",
      mustChangePassword: true,
      isActive: true,
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("+ Create User")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("+ Create User"));

    expect(screen.getByText("Create New User Account")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "new.user@toktickit.local" },
    });

    const passwordInput = screen.getByPlaceholderText(/min 8 chars/i);
    fireEvent.change(passwordInput, { target: { value: "Initial123!" } });

    const submitBtn = screen.getByRole("button", { name: /^create user$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createAdminUser).toHaveBeenCalledWith({
        name: "New User",
        email: "new.user@toktickit.local",
        role: "REQUESTER",
        isActive: true,
        initialPassword: "Initial123!",
      });
    });
  });

  it("displays duplicate email 409 Conflict error banner in Create modal (AC-21)", async () => {
    (api.fetchAdminUsers as any).mockResolvedValue(mockUsers);
    const err = new Error("A user account with this email address already exists.");
    (err as any).status = 409;
    (err as any).code = "EMAIL_ALREADY_EXISTS";
    (api.createAdminUser as any).mockRejectedValueOnce(err);

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText("+ Create User")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("+ Create User"));

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Dup User" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "admin@toktickit.local" },
    });
    fireEvent.change(screen.getByPlaceholderText(/min 8 chars/i), { target: { value: "Initial123!" } });

    fireEvent.click(screen.getByRole("button", { name: /^create user$/i }));

    await waitFor(() => {
      expect(screen.getByText("A user account with this email address already exists.")).toBeInTheDocument();
    });
  });

  it("opens Edit User modal and submits updated role and name (AC-22)", async () => {
    (api.fetchAdminUsers as any).mockResolvedValue(mockUsers);
    (api.updateAdminUser as any).mockResolvedValueOnce({
      ...mockUsers[2],
      name: "Jennifer Anderson Updated",
      role: "IT_STAFF",
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getAllByText("Edit")[2]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Edit")[2]); // Click edit on Jennifer

    expect(screen.getByText("Edit User Account")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(api.updateAdminUser).toHaveBeenCalledWith(3, {
        name: "Jennifer Anderson",
        email: "jennifer.a@toktickit.local",
        role: "REQUESTER",
        isActive: true,
      });
    });
  });

  it("opens Reset Password modal and submits new initial password (AC-24)", async () => {
    (api.fetchAdminUsers as any).mockResolvedValue(mockUsers);
    (api.resetAdminUserPassword as any).mockResolvedValueOnce({
      ...mockUsers[2],
      mustChangePassword: true,
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getAllByText("Reset Password")[2]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Reset Password")[2]);

    expect(screen.getByText("Reset Initial Password")).toBeInTheDocument();

    const newPwdInput = screen.getByPlaceholderText(/min 8 chars/i);
    fireEvent.change(newPwdInput, { target: { value: "NewInitial123!" } });

    fireEvent.click(screen.getByRole("button", { name: /set initial password/i }));

    await waitFor(() => {
      expect(api.resetAdminUserPassword).toHaveBeenCalledWith(3, "NewInitial123!");
    });
  });
});
