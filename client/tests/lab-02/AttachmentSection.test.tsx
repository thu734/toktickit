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

  it("disables upload controls and displays limit warning when 5 active attachments exist (UI-06, AC-06)", () => {
    const fiveActiveAttachments: api.Attachment[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      filename: `file_${i + 1}.pdf`,
      mimeType: "application/pdf",
      fileSize: 1024,
      isRemoved: false,
      createdAt: "2026-01-01T10:00:00Z",
    }));

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <AttachmentSection
          ticketId={101}
          attachments={fiveActiveAttachments}
          onAttachmentChange={vi.fn()}
        />
      </RequesterProvider>
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Maximum limit of 5 active attachments reached/i
    );

    const input = screen.getByLabelText(/Upload New Attachment/i) as HTMLInputElement;
    expect(input).toBeDisabled();

    const uploadButton = screen.getByRole("button", { name: /Upload File/i });
    expect(uploadButton).toBeDisabled();
  });

  it("clears selectedFile and resets file input element upon successful upload", async () => {
    vi.spyOn(api, "uploadAttachment").mockResolvedValue({
      id: 99,
      ticketId: 101,
      filename: "sample.pdf",
      storedFilename: "99-sample.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 1024,
      isRemoved: false,
      uploadedAt: "2026-01-01T10:00:00Z",
      uploadedByRequesterId: 1,
    });

    const onAttachmentChangeMock = vi.fn();

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <AttachmentSection
          ticketId={101}
          attachments={[]}
          onAttachmentChange={onAttachmentChangeMock}
        />
      </RequesterProvider>
    );

    const input = screen.getByLabelText(/Upload New Attachment/i) as HTMLInputElement;
    const validFile = new File(["sample content"], "sample.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [validFile] } });

    const uploadButton = screen.getByRole("button", { name: /Upload File/i });
    expect(uploadButton).not.toBeDisabled();

    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(api.uploadAttachment).toHaveBeenCalledWith(101, validFile, 1);
      expect(onAttachmentChangeMock).toHaveBeenCalled();
      expect(uploadButton).toBeDisabled();
      expect(input.value).toBe("");
    });
  });

  it("retains selectedFile and input selection when upload API returns failure", async () => {
    vi.spyOn(api, "uploadAttachment").mockRejectedValue(new Error("Network error during file upload"));

    const onAttachmentChangeMock = vi.fn();

    render(
      <RequesterProvider initialRequester={mockRequester}>
        <AttachmentSection
          ticketId={101}
          attachments={[]}
          onAttachmentChange={onAttachmentChangeMock}
        />
      </RequesterProvider>
    );

    const input = screen.getByLabelText(/Upload New Attachment/i) as HTMLInputElement;
    const validFile = new File(["sample content"], "retry_me.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [validFile] } });

    const uploadButton = screen.getByRole("button", { name: /Upload File/i });
    expect(uploadButton).not.toBeDisabled();

    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error during file upload");
      expect(uploadButton).not.toBeDisabled();
      expect(onAttachmentChangeMock).not.toHaveBeenCalled();
    });
  });
});
