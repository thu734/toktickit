import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import * as api from "../../src/api.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import { AttachmentSection } from "../../src/components/AttachmentSection.js";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.a@toktickit.local",
  department: "Marketing",
};

describe("Lab 2 Attachment Section UI Tests (UI-06, AC-04, AC-07)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders active attachments list and soft-removed audit list (UI-06, AC-04, AC-07)", () => {
    const mockAttachments: api.Attachment[] = [
      {
        id: 1,
        filename: "active_log.pdf",
        mimeType: "application/pdf",
        fileSize: 1048576,
        isRemoved: false,
        createdAt: "2026-01-01T10:00:00Z",
      },
      {
        id: 2,
        filename: "old_screenshot.png",
        mimeType: "image/png",
        fileSize: 512000,
        isRemoved: true,
        removedAt: "2026-01-01T11:00:00Z",
        removalReason: "Uploaded duplicate image",
        createdAt: "2026-01-01T10:05:00Z",
      },
    ];

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
          onAttachmentChange={vi.fn()}
        />
      </RequesterProvider>
    );

    expect(screen.getByText("active_log.pdf")).toBeInTheDocument();
    expect(screen.getByText("old_screenshot.png")).toBeInTheDocument();
    expect(screen.getByText(/Soft-Removed Audit History/i)).toBeInTheDocument();
    expect(screen.getByText(/Reason:/i)).toBeInTheDocument();
    expect(screen.getByText(/Uploaded duplicate image/i)).toBeInTheDocument();
  });

  it("opens soft-removal modal and submits valid removal reason (UI-06, AC-07, BR-20)", async () => {
    const mockAttachments: api.Attachment[] = [
      {
        id: 1,
        filename: "active_doc.pdf",
        mimeType: "application/pdf",
        fileSize: 1048576,
        isRemoved: false,
        createdAt: "2026-01-01T10:00:00Z",
      },
    ];

    const onAttachmentChangeMock = vi.fn();
    vi.spyOn(api, "softRemoveAttachment").mockResolvedValue({
      id: 1,
      filename: "active_doc.pdf",
      mimeType: "application/pdf",
      fileSize: 1048576,
      isRemoved: true,
      removedAt: "2026-01-01T12:00:00Z",
      removalReason: "Superceded file version",
      createdAt: "2026-01-01T10:00:00Z",
    });

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
          onAttachmentChange={onAttachmentChangeMock}
        />
      </RequesterProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));

    await waitFor(() => {
      expect(screen.getByText(/Confirm Soft Removal/i)).toBeInTheDocument();
    });

    const reasonInput = screen.getByPlaceholderText(/State reason for removing this attachment/i);
    fireEvent.change(reasonInput, { target: { value: "Superceded file version" } });

    fireEvent.click(screen.getByRole("button", { name: /Confirm Removal/i }));

    await waitFor(() => {
      expect(api.softRemoveAttachment).toHaveBeenCalledWith(1, "Superceded file version", 1);
      expect(onAttachmentChangeMock).toHaveBeenCalled();
    });
  });

  it("validates invalid file selection client-side (UI-06, AC-05)", () => {
    render(
      <RequesterProvider initialRequester={mockRequester}>
        <AttachmentSection
          ticketId={101}
          attachments={[]}
          onAttachmentChange={vi.fn()}
        />
      </RequesterProvider>
    );

    const input = screen.getByLabelText(/Upload New Attachment/i);
    const invalidFile = new File(["dummy"], "test.exe", { type: "application/x-msdownload" });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Only JPG, PNG, WEBP, and PDF files under 5 MB are allowed/i
    );
  });
});
