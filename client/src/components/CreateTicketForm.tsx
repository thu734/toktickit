import React, { useEffect, useState } from "react";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  uploadAttachment,
  Category,
  RelatedSystem,
  Ticket,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

interface CreateTicketFormProps {
  onViewTicketDetail?: (ticketId: number) => void;
}

export const CreateTicketForm: React.FC<CreateTicketFormProps> = ({
  onViewTicketDetail,
}) => {
  const { activeRequester } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [loadingRef, setLoadingRef] = useState<boolean>(true);

  // Form State
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Initial Attachments State & Validation (BR-15, BR-16, BR-17, BR-22)
  const [selectedInitialFiles, setSelectedInitialFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string>("");
  const [uploadWarning, setUploadWarning] = useState<string>("");

  // Submission & Validation States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string>("");
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

  const handleInitialFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError("");
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentFiles = [...selectedInitialFiles];
    let errorMsg = "";

    for (const file of files) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase()) && !ALLOWED_EXTENSIONS.includes(ext)) {
        errorMsg = "File type not permitted. Only JPG, PNG, WEBP, and PDF files under 5 MB are allowed.";
        break;
      }
      if (file.size > 5 * 1024 * 1024) {
        errorMsg = "File size exceeds 5 MB limit.";
        break;
      }
      if (currentFiles.length >= 5) {
        errorMsg = "Maximum limit of 5 active attachments reached for this ticket.";
        break;
      }
      currentFiles.push(file);
    }

    if (errorMsg) {
      setAttachmentError(errorMsg);
    } else {
      setSelectedInitialFiles(currentFiles);
    }
    e.target.value = "";
  };

  const handleRemoveInitialFile = (index: number) => {
    setAttachmentError("");
    setSelectedInitialFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    async function loadReferenceData() {
      setLoadingRef(true);
      try {
        const [catData, sysData] = await Promise.all([
          fetchCategories(),
          fetchRelatedSystems(),
        ]);
        setCategories(catData);
        setSystems(sysData);
        if (catData.length > 0) setCategoryId(String(catData[0].id));
        if (sysData.length > 0) setRelatedSystemId(String(sysData[0].id));
      } catch (_err) {
        setApiError("Failed to load request categories or systems.");
      } finally {
        setLoadingRef(false);
      }
    }

    loadReferenceData();
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      errors.summary = "Ticket Summary is required.";
    } else if (trimmedSummary.length < 5 || trimmedSummary.length > 150) {
      errors.summary = "Summary must be between 5 and 150 characters.";
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      errors.description = "Description is required.";
    } else if (trimmedDesc.length < 10 || trimmedDesc.length > 3000) {
      errors.description = "Description must be between 10 and 3000 characters.";
    }

    if (!categoryId) errors.categoryId = "Category is required.";
    if (!relatedSystemId) errors.relatedSystemId = "Related System is required.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // BR-13 double submit lock

    setApiError("");
    setFormErrors({});

    if (!validateForm()) return;
    if (!activeRequester) {
      setApiError("No active requester selected. Please select a requester context.");
      return;
    }

    setSubmitting(true);
    setUploadWarning("");

    try {
      const ticket = await createTicket(
        {
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          requestedPriority,
          summary: summary.trim(),
          description: description.trim(),
        },
        activeRequester.id
      );

      // BR-22: Sequential upload of initial attachments after ticket creation
      if (selectedInitialFiles.length > 0) {
        const failedFiles: string[] = [];
        for (const file of selectedInitialFiles) {
          try {
            await uploadAttachment(ticket.id, file, activeRequester.id);
          } catch (_err) {
            failedFiles.push(file.name);
          }
        }

        if (failedFiles.length > 0) {
          setUploadWarning(
            `Ticket created successfully (${ticket.ticketNumber}), but failed to upload initial attachment(s): ${failedFiles.join(", ")}. You may retry uploading from Ticket Detail.`
          );
        }
      }

      setCreatedTicket(ticket);
    } catch (err: any) {
      if (err.details) {
        setFormErrors(err.details);
      } else {
        setApiError(err.message || "An unexpected error occurred while submitting the ticket.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCreatedTicket(null);
    setSummary("");
    setDescription("");
    setRequestedPriority("MEDIUM");
    setSelectedInitialFiles([]);
    setAttachmentError("");
    setUploadWarning("");
    setFormErrors({});
    setApiError("");
  };

  if (createdTicket) {
    return (
      <div className="card border-0 shadow-sm p-4 text-center" style={{ borderRadius: 12 }}>
        <div
          className="d-inline-flex align-items-center justify-content-center mx-auto mb-3"
          style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#EAF6EF", color: "#006B3C", fontSize: 32 }}
        >
          ✓
        </div>
        <h2 className="h4 fw-bold mb-2" style={{ color: "#1E2923" }}>
          Ticket Created Successfully!
        </h2>
        <p className="text-muted small mb-3">
          Your IT service request has been logged and assigned an official Ticket Number.
        </p>

        <div className="p-3 rounded mb-4 text-start mx-auto" style={{ backgroundColor: "#F5F7F6", maxWidth: 500, border: "1px solid #E2E8F0" }}>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted small">Ticket Number:</span>
            <span className="font-monospace fw-bold" style={{ color: "#006B3C" }}>{createdTicket.ticketNumber}</span>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted small">Initial Status:</span>
            <span className="badge bg-success-subtle text-success border border-success-subtle">{createdTicket.currentStatus}</span>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted small">IT Priority:</span>
            <span className="badge bg-secondary-subtle text-secondary">{createdTicket.itPriority}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted small">Summary:</span>
            <span className="fw-semibold small text-truncate" style={{ maxWidth: 300 }}>{createdTicket.summary}</span>
          </div>
        </div>

        {uploadWarning && (
          <div className="alert alert-warning py-2 small mb-4 text-start mx-auto" style={{ maxWidth: 500 }} role="alert">
            ⚠️ {uploadWarning}
          </div>
        )}

        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
          {onViewTicketDetail && (
            <button
              type="button"
              className="btn btn-sm text-nowrap fw-semibold px-4"
              style={{
                backgroundColor: "#FFFFFF",
                color: "#006B3C",
                border: "1px solid #006B3C",
                transition: "all 0.2s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#EAF6EF";
                e.currentTarget.style.color = "#006B3C";
                e.currentTarget.style.borderColor = "#006B3C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FFFFFF";
                e.currentTarget.style.color = "#006B3C";
                e.currentTarget.style.borderColor = "#006B3C";
              }}
              onClick={() => onViewTicketDetail(createdTicket.id)}
            >
              View Ticket Detail
            </button>
          )}

          <button
            type="button"
            className="btn text-white fw-semibold px-4"
            style={{ backgroundColor: "#006B3C" }}
            onClick={resetForm}
          >
            Create Another Ticket
          </button>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="card border-0 shadow-sm p-4" style={{ borderRadius: 12, maxWidth: 800, margin: "0 auto" }}>
      <h2 className="h4 fw-bold mb-1" style={{ color: "#1E2923" }}>
        Create IT Support Ticket
      </h2>
      <p className="text-muted small mb-4">
        Submit a new IT service request. All fields marked with <span style={{ color: "#D92D20" }}>*</span> are required.
      </p>

      {apiError && (
        <div className="alert alert-danger py-2 small mb-4" role="alert" aria-live="polite">
          🚨 {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Top Row: System Generated Read-Only Fields */}
        <div className="row g-3 mb-4 p-3 rounded" style={{ backgroundColor: "#F1F5F3" }}>
          <div className="col-md-6">
            <label className="form-label small fw-semibold text-muted mb-1">
              Ticket Number <span className="fw-normal text-muted">(Auto-Generated)</span>
            </label>
            <input
              type="text"
              className="form-control form-control-sm font-monospace text-muted"
              value="TKT-YYYY-XXXXXX"
              readOnly
              tabIndex={-1}
              style={{ backgroundColor: "#EAF6EF", color: "#006B3C" }}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold text-muted mb-1">
              Created Date
            </label>
            <input
              type="text"
              className="form-control form-control-sm text-muted"
              value={currentDate}
              readOnly
              tabIndex={-1}
              style={{ backgroundColor: "#FFFFFF" }}
            />
          </div>
        </div>

        {/* Classification Grid */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label htmlFor="categoryId" className="form-label small fw-semibold">
              Category <span style={{ color: "#D92D20" }}>*</span>
            </label>
            <select
              id="categoryId"
              className={`form-select ${formErrors.categoryId ? "is-invalid" : ""}`}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loadingRef}
              aria-required="true"
              aria-invalid={Boolean(formErrors.categoryId)}
            >
              {loadingRef ? (
                <option>Loading categories...</option>
              ) : (
                categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
            {formErrors.categoryId && (
              <div className="invalid-feedback d-block small" style={{ color: "#D92D20" }} role="alert">
                {formErrors.categoryId}
              </div>
            )}
          </div>

          <div className="col-md-6">
            <label htmlFor="relatedSystemId" className="form-label small fw-semibold">
              Related System <span style={{ color: "#D92D20" }}>*</span>
            </label>
            <select
              id="relatedSystemId"
              className={`form-select ${formErrors.relatedSystemId ? "is-invalid" : ""}`}
              value={relatedSystemId}
              onChange={(e) => setRelatedSystemId(e.target.value)}
              disabled={loadingRef}
              aria-required="true"
              aria-invalid={Boolean(formErrors.relatedSystemId)}
            >
              {loadingRef ? (
                <option>Loading systems...</option>
              ) : (
                systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
            {formErrors.relatedSystemId && (
              <div className="invalid-feedback d-block small" style={{ color: "#D92D20" }} role="alert">
                {formErrors.relatedSystemId}
              </div>
            )}
          </div>
        </div>

        {/* Priority Selector */}
        <div className="mb-3">
          <label htmlFor="requestedPriority" className="form-label small fw-semibold">
            Requested Priority <span style={{ color: "#D92D20" }}>*</span>
          </label>
          <select
            id="requestedPriority"
            className={`form-select ${formErrors.requestedPriority ? "is-invalid" : ""}`}
            value={requestedPriority}
            aria-required="true"
            aria-invalid={Boolean(formErrors.requestedPriority)}
            onChange={(e) =>
              setRequestedPriority(
                e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT"
              )
            }
          >
            <option value="LOW">Low - Minimal business impact</option>
            <option value="MEDIUM">Medium - Normal operational request</option>
            <option value="HIGH">High - Significant work degradation</option>
            <option value="URGENT">Urgent - Work stoppage / system down</option>
          </select>
          {formErrors.requestedPriority && (
            <div className="invalid-feedback d-block small" style={{ color: "#D92D20" }} role="alert">
              {formErrors.requestedPriority}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mb-3">
          <label htmlFor="summary" className="form-label small fw-semibold">
            Ticket Summary <span style={{ color: "#D92D20" }}>*</span>
          </label>
          <input
            id="summary"
            type="text"
            className={`form-control ${formErrors.summary ? "is-invalid" : ""}`}
            placeholder="Brief summary of the issue (5 - 150 characters)"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={150}
            aria-required="true"
            aria-invalid={Boolean(formErrors.summary)}
          />
          {formErrors.summary && (
            <div className="invalid-feedback d-block small" style={{ color: "#D92D20" }} role="alert">
              {formErrors.summary}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <label htmlFor="description" className="form-label small fw-semibold">
            Detailed Description <span style={{ color: "#D92D20" }}>*</span>
          </label>
          <textarea
            id="description"
            rows={5}
            className={`form-control ${formErrors.description ? "is-invalid" : ""}`}
            placeholder="Provide complete details, steps to reproduce, or error messages (10 - 3000 characters)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={3000}
            aria-required="true"
            aria-invalid={Boolean(formErrors.description)}
          />
          {formErrors.description && (
            <div className="invalid-feedback d-block small" style={{ color: "#D92D20" }} role="alert">
              {formErrors.description}
            </div>
          )}
        </div>

        {/* Attachments (Optional) Section */}
        <div className="mb-4 pt-3 border-top">
          <label htmlFor="initial-attachments-input" className="form-label small fw-semibold">
            Attachments <span className="text-muted fw-normal">(Optional, max 5 files, 5 MB each)</span>
          </label>
          <input
            id="initial-attachments-input"
            type="file"
            className="form-control form-control-sm mb-2"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            multiple
            onChange={handleInitialFileSelect}
            disabled={submitting}
          />
          <span className="text-muted small d-block mb-2">
            Allowed types: JPG, JPEG, PNG, WEBP, PDF (max 5 MB per file)
          </span>

          {attachmentError && (
            <div className="alert alert-danger py-2 small mb-2" role="alert">
              {attachmentError}
            </div>
          )}

          {selectedInitialFiles.length > 0 && (
            <ul className="list-group mb-2">
              {selectedInitialFiles.map((file, idx) => (
                <li
                  key={idx}
                  className="list-group-item d-flex justify-content-between align-items-center py-2 small"
                >
                  <div>
                    <span className="me-2">📄</span>
                    <span className="fw-semibold me-2">{file.name}</span>
                    <span className="text-muted">({formatFileSize(file.size)})</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-0 px-2"
                    onClick={() => handleRemoveInitialFile(idx)}
                    disabled={submitting}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submit Actions */}
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary px-4"
            onClick={resetForm}
            disabled={submitting}
          >
            Clear Form
          </button>
          <button
            type="submit"
            className="btn text-white fw-semibold px-4 d-flex align-items-center gap-2"
            style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Ticket</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
