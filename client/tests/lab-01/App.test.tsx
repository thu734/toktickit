import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import App from "../../src/App.js";

describe("App Header & Brand Baseline (Lab 1 / Lab 2 Integration)", () => {
  it("renders the TokTickIT brand logo and heading", () => {
    render(<App />);
    expect(screen.getAllByText(/TokTickIT/i)[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Ticket/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /My Tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Profile/i })).toBeInTheDocument();
  });
});
