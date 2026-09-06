import React, { useState } from "react";
import { Attachment, uploadAttachment, downloadAttachment, softRemoveAttachment } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

interface AttachmentSectionProps {
  ticketId: number;
  attachments: Attachment[];
  onAttachmentChange: () => void;
}

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  ticketId,
  attachments,
  onAttachmentChange,
}) => {
  const { activeRequester } = useRequester();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Soft removal modal state
  const [removalModalOpen, setRemovalModalOpen] = useState(false);
  const [targetAttachment, setTargetAttachment] = useState<Attachment | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [removing, setRemoving] = useState(false);

  // Toast / alert for blocked downloads
  const [toastMessage, setToastMessage] = useState("");

  const activeAttachments = attachments.filter((a) => !a.isRemoved);
  const removedAttachments = attachments.filter((a) => a.isRemoved);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase()) && !ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(
        "File type not permitted. Only JPG, PNG, WEBP, and PDF files under 5 MB are allowed."
      );
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5 MB limit.");
      setSelectedFile(null);
      return;
    }

    if (activeAttachments.length >= 5) {
      setUploadError("Maximum active attachment limit (5) reached for this ticket.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !activeRequester) return;

    setUploading(true);
    setUploadError("");

    try {
      await uploadAttachment(ticketId, selectedFile, activeRequester.id);
      setSelectedFile(null);
      onAttachmentChange();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    if (!activeRequester) return;

    if (attachment.isRemoved) {
      setToastMessage("This attachment was soft-removed and can no longer be downloaded.");
      return;
    }

    try {
      await downloadAttachment(attachment.id, attachment.filename, activeRequester.id);
    } catch (err: any) {
      if (err.status === 410) {
        setToastMessage("This attachment was soft-removed and can no longer be downloaded.");
      } else {
        alert(err.message || "Download failed.");
      }
    }
  };

  const openRemovalModal = (attachment: Attachment) => {
    setTargetAttachment(attachment);
    setRemovalReason("");
    setRemovalError("");
    setRemovalModalOpen(true);
  };

  const closeRemovalModal = () => {
    setRemovalModalOpen(false);
    setTargetAttachment(null);
    setRemovalReason("");
    setRemovalError("");
  };

  const handleConfirmRemoval = async () => {
    if (!targetAttachment || !activeRequester) return;

    const trimmed = removalReason.trim();
    if (!trimmed || trimmed.length < 5 || trimmed.length > 250) {
      setRemovalError("Removal reason is required and must be between 5 and 250 characters.");
      return;
    }

    setRemoving(true);
    setRemovalError("");

    try {
      await softRemoveAttachment(targetAttachment.id, trimmed, activeRequester.id);
      closeRemovalModal();
      onAttachmentChange();
    } catch (err: any) {
      setRemovalError(err.message || "Failed to soft-remove attachment.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div aria-label="Ticket attachments section">
      <h2 className="h5 fw-semibold mb-3 d-flex align-items-center gap-2" style={{ color: "#1E2923" }}>
        <span>Attachments</span>
        <span
          className="badge bg-light text-dark border font-monospace fw-normal"
          style={{ fontSize: "0.78rem" }}
        >
          {activeAttachments.length} / 5 active
        </span>
      </h2>

      {toastMessage && (
        <div
          className="alert alert-warning alert-dismissible fade show small mb-3"
          role="alert"
        >
          {toastMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setToastMessage("")}
            aria-label="Close message"
          ></button>
        </div>
      )}

      {/* Active Attachments List */}
      <div className="mb-4">
        {activeAttachments.length === 0 ? (
          <p className="text-muted small italic mb-3">No active attachments.</p>
        ) : (
          <ul className="list-group mb-3">
            {activeAttachments.map((att) => (
              <li
                key={att.id}
                className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <div className="d-flex align-items-center gap-2 text-truncate">
                  <span aria-hidden="true">📎</span>
                  <span className="fw-semibold small text-truncate" title={att.filename}>
                    {att.filename}
                  </span>
                  <span className="text-muted small">({formatFileSize(att.fileSize)})</span>
                </div>

                <div className="d-flex align-items-center gap-2 align-self-end align-self-sm-center ms-auto">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    style={{
                      borderColor: "#006B3C",
                      color: "#006B3C",
                      transition: "all 0.2s ease-in-out",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#EAF6EF";
                      e.currentTarget.style.color = "#006B3C";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#006B3C";
                    }}
                    onClick={() => handleDownload(att)}
                  >
                    Download
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => openRemovalModal(att)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upload Dropzone Form */}
      {(() => {
        const isLimitReached = activeAttachments.length >= 5;
        return (
          <div
            className="p-3 rounded mb-4"
            style={{
              backgroundColor: isLimitReached ? "#F8FAFC" : "#F5F7F6",
              border: "1px dashed #CBD5E1",
              opacity: isLimitReached ? 0.9 : 1,
            }}
          >
            <form onSubmit={handleUploadSubmit}>
              <label htmlFor="attachment-upload-input" className="form-label small fw-semibold mb-2">
                Upload New Attachment (JPG, PNG, WEBP, PDF up to 5 MB)
              </label>

              {isLimitReached && (
                <div
                  className="alert alert-warning py-2 px-3 small mb-3 border-warning-subtle text-warning-emphasis"
                  role="alert"
                >
                  ⚠️ Maximum limit of 5 active attachments reached for this ticket. Soft-remove an active attachment to upload new files.
                </div>
              )}

              <div className="d-flex flex-column flex-sm-row gap-2">
                <input
                  id="attachment-upload-input"
                  type="file"
                  className="form-control form-control-sm"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileSelect}
                  disabled={uploading || isLimitReached}
                />

                <button
                  type="submit"
                  className="btn btn-sm text-white fw-semibold px-3 text-nowrap"
                  style={{
                    backgroundColor: "#006B3C",
                    opacity: isLimitReached || !selectedFile || uploading ? 0.65 : 1,
                  }}
                  disabled={!selectedFile || uploading || isLimitReached}
                >
                  {uploading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Uploading...
                    </>
                  ) : (
                    "Upload File"
                  )}
                </button>
              </div>

              {uploadError && (
                <p className="small text-danger mt-2 mb-0" role="alert">
                  {uploadError}
                </p>
              )}
            </form>
          </div>
        );
      })()}

      {/* Soft-Removed Attachments Audit History */}
      {removedAttachments.length > 0 && (
        <div className="mt-4 pt-3 border-top">
          <h4 className="h6 fw-semibold text-muted mb-2">Soft-Removed Audit History</h4>

          <ul className="list-group">
            {removedAttachments.map((att) => (
              <li
                key={att.id}
                className="list-group-item bg-light text-muted small d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2"
                style={{ opacity: 0.85 }}
              >
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="text-decoration-line-through fw-semibold">
                      {att.filename}
                    </span>

                    <span className="badge bg-secondary rounded-pill">Soft-Removed</span>
                  </div>

                  {att.removalReason && (
                    <div className="text-muted small">
                      <strong>Reason:</strong> "{att.removalReason}"
                    </div>
                  )}

                  <div className="text-muted extra-small" style={{ fontSize: "0.72rem" }}>
                    Removed on {formatDate(att.removedAt || undefined)}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary disabled align-self-start align-self-sm-center"
                  disabled={true}
                  title="Attachment soft-removed"
                  onClick={() => handleDownload(att)}
                >
                  Download Blocked
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Soft Removal Modal */}
      {removalModalOpen && targetAttachment && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="removal-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title h6 fw-semibold" id="removal-modal-title">
                  Confirm Soft Removal
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRemovalModal}
                  disabled={removing}
                  aria-label="Close modal"
                ></button>
              </div>

              <div className="modal-body">
                <p className="small mb-3">
                  Are you sure you want to soft-remove <strong>{targetAttachment.filename}</strong>?
                  This action cannot be undone and will permanently disable downloading.
                </p>

                <div className="mb-3">
                  <label htmlFor="removal-reason-input" className="form-label small fw-semibold">
                    Removal Reason <span className="text-danger">*</span> (5 - 250 characters)
                  </label>

                  <textarea
                    id="removal-reason-input"
                    className={`form-control ${removalError ? "is-invalid" : ""}`}
                    rows={3}
                    maxLength={250}
                    placeholder="State reason for removing this attachment..."
                    value={removalReason}
                    onChange={(e) => {
                      setRemovalReason(e.target.value);
                      if (removalError) setRemovalError("");
                    }}
                    disabled={removing}
                  />

                  <div className="d-flex justify-content-between align-items-center mt-1">
                    <span className="small text-muted">{removalReason.trim().length} / 250</span>

                    {removalError && (
                      <span className="small text-danger" role="alert">
                        {removalError}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closeRemovalModal}
                  disabled={removing}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handleConfirmRemoval}
                  disabled={removing || removalReason.trim().length < 5}
                >
                  {removing ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Removing...
                    </>
                  ) : (
                    "Confirm Removal"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
