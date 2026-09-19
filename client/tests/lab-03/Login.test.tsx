import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { Login } from "../../src/components/Login";
import { AuthProvider } from "../../src/context/AuthContext";
import * as api from "../../src/api";

vi.mock("../../src/api", () => ({
  loginApi: vi.fn(),
  logoutApi: vi.fn(),
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
}));

describe("UI-01: Login Screen Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form with TokTickIT header and inputs", () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("validates empty email and displays inline error banner", async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    });
  });

  it("displays safe failure error banner when login returns 401 Unauthorized", async () => {
    (api.loginApi as any).mockRejectedValueOnce(new Error("Invalid email or password. Please try again."));

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "jennifer.a@toktickit.local" } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: "WrongPassword!" } });


    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.loginApi).toHaveBeenCalledWith("jennifer.a@toktickit.local", "WrongPassword!");
      expect(screen.getByText("Invalid email or password. Please try again.")).toBeInTheDocument();
    });
  });
});
