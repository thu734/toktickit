import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ChangePassword } from "../../src/components/ChangePassword";
import * as api from "../../src/api";

vi.mock("../../src/api", () => ({
  changePassword: vi.fn(),
}));

describe("UI-02: Mandatory Change Password Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Mandatory Password Change card and form elements", () => {
    render(<ChangePassword />);

    expect(screen.getByText("Mandatory Password Change")).toBeInTheDocument();
    expect(
      screen.getByText("You must change your initial password before continuing to TokTickIT.")
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
    expect(screen.getByText("Password Requirements Checklist:")).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Save New Password/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });

  it("dynamically enables submit button when all password rules are met", async () => {
    render(<ChangePassword />);

    const currentInput = screen.getByLabelText(/Current Password/i);
    const newInput = screen.getByLabelText(/^New Password/i);
    const confirmInput = screen.getByLabelText(/Confirm New Password/i);
    const submitBtn = screen.getByRole("button", { name: /Save New Password/i });

    fireEvent.change(currentInput, { target: { value: "Initial123!" } });
    fireEvent.change(newInput, { target: { value: "NewSecure123!" } });
    fireEvent.change(confirmInput, { target: { value: "NewSecure123!" } });

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it("submits valid password change payload and handles success", async () => {
    const handleSuccess = vi.fn();
    (api.changePassword as any).mockResolvedValueOnce({
      message: "Password changed successfully",
      mustChangePassword: false,
    });

    render(<ChangePassword onSuccess={handleSuccess} />);

    fireEvent.change(screen.getByLabelText(/Current Password/i), { target: { value: "Initial123!" } });
    fireEvent.change(screen.getByLabelText(/^New Password/i), { target: { value: "NewSecure123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), { target: { value: "NewSecure123!" } });

    const submitBtn = screen.getByRole("button", { name: /Save New Password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.changePassword).toHaveBeenCalledWith({
        currentPassword: "Initial123!",
        newPassword: "NewSecure123!",
        confirmPassword: "NewSecure123!",
      });
      expect(screen.getByText("Password changed successfully")).toBeInTheDocument();
    });
  });

  it("displays error banner when API returns error", async () => {
    (api.changePassword as any).mockRejectedValueOnce(new Error("Current password is incorrect."));

    render(<ChangePassword />);

    fireEvent.change(screen.getByLabelText(/Current Password/i), { target: { value: "WrongCurrent!" } });
    fireEvent.change(screen.getByLabelText(/^New Password/i), { target: { value: "NewSecure123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), { target: { value: "NewSecure123!" } });

    const submitBtn = screen.getByRole("button", { name: /Save New Password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Current password is incorrect.")).toBeInTheDocument();
    });
  });
});
