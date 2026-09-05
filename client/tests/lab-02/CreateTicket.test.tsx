import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

describe("Lab 2 Development Requester Selection & Exclusion UI (UI-01, UI-07)", () => {
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

    // Inactive requester Robert Smith must not be present in options
    expect(screen.queryByRole("option", { name: "Robert Smith" })).not.toBeInTheDocument();
  });
});
