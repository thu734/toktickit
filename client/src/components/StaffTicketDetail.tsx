import React, { useEffect, useState, useCallback } from "react";
import {
  fetchStaffTicketDetail,
  assignStaffTicket,
  updateStaffTicketPriority,
  updateStaffTicketStatus,
  fetchTicketComments,
  postTicketComment,
  fetchInternalNotes,
  postInternalNote,
  fetchStaffUsers,
  StaffUser,
  Comment,
  InternalNote,
} from "../api.js";

interface StaffTicketDetailProps {
  ticketId: number;
  currentUserRole?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  currentUserId?: number;
  onBack?: () => void;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

export const StaffTicketDetail: React.FC<StaffTicketDetailProps> = ({
  ticketId,
  currentUserRole,
  currentUserId,
  onBack,
}) => {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successBanner, setSuccessBanner] = useState("");

  // Operational states
  const [assigning, setAssigning] = useState(false);
  const [priorityUpdating, setPriorityUpdating] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [resolutionSummaryInput, setResolutionSummaryInput] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState("");

  // Tabs: "comments", "notes", "attachments"
  const [activeTab, setActiveTab] = useState<"comments" | "notes" | "attachments">("comments");
  const [comments, setComments] = useState<Comment[]>([]);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [newCommentInput, setNewCommentInput] = useState("");
  const [newNoteInput, setNewNoteInput] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [tabError, setTabError] = useState("");

  // Staff users for assignment dropdown
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  const loadTicketData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchStaffTicketDetail(ticketId);
      setTicket(data);
      setSelectedPriority(data.itPriority);
      setSelectedStatus(data.currentStatus);
      setResolutionSummaryInput(data.resolutionSummary || "");

      // Load comments & notes
      const [fetchedComments, fetchedNotes] = await Promise.all([
        fetchTicketComments(ticketId).catch(() => []),
        fetchInternalNotes(ticketId).catch(() => []),
      ]);
      setComments(fetchedComments);
      setInternalNotes(fetchedNotes);
    } catch (err: any) {
      if (err?.status === 403) {
        setError("Access Denied: IT Staff authorization required.");
      } else {
        setError(err.message || "Failed to load ticket details.");
      }
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  // Load active staff users for assignment dropdown
  useEffect(() => {
    fetchStaffUsers()
      .then((users) => setStaffUsers(users))
      .catch(() => setStaffUsers([]));
  }, []);

  const handleClaimTicket = async () => {
    if (!currentUserId) return;
    setAssigning(true);
    setError("");
    setSuccessBanner("");
    try {
      const updated = await assignStaffTicket(ticketId, currentUserId);
      setTicket(updated);
      setSuccessBanner("Ticket claimed successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to claim ticket.");
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignChange = async (targetIdStr: string) => {
    setAssigning(true);
    setError("");
    setSuccessBanner("");
    try {
      const targetId = targetIdStr === "unassigned" || targetIdStr === "" ? null : parseInt(targetIdStr, 10);
      const updated = await assignStaffTicket(ticketId, targetId);
      setTicket(updated);
      setSuccessBanner("Ticket assignment updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to reassign ticket.");
    } finally {
      setAssigning(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    setPriorityUpdating(true);
    setError("");
    setSuccessBanner("");
    try {
      const updated = await updateStaffTicketPriority(ticketId, newPriority);
      setTicket(updated);
      setSelectedPriority(updated.itPriority);
      setSuccessBanner("IT Priority updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update IT priority.");
    } finally {
      setPriorityUpdating(false);
    }
  };

  const handleStatusSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetStatus = e.target.value;
    if (targetStatus === "CANCELLED" || targetStatus === "REOPENED") {
      setPendingStatusChange(targetStatus);
      setShowConfirmationModal(true);
    } else {
      setSelectedStatus(targetStatus);
    }
  };

  const confirmStatusChange = () => {
    setSelectedStatus(pendingStatusChange);
    setShowConfirmationModal(false);
    setPendingStatusChange("");
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus || selectedStatus === ticket.currentStatus) return;

    setStatusUpdating(true);
    setError("");
    setSuccessBanner("");
    try {
      const updated = await updateStaffTicketStatus(
        ticketId,
        selectedStatus,
        selectedStatus === "RESOLVED" ? resolutionSummaryInput : undefined
      );
      setTicket(updated);
      setSelectedStatus(updated.currentStatus);
      setSuccessBanner("Ticket status updated successfully.");
    } catch (err: any) {
      setError(err.message || "Invalid status transition.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentInput.trim()) return;

    setCommentSubmitting(true);
    setTabError("");
    try {
      const newComment = await postTicketComment(ticketId, newCommentInput.trim());
      setComments((prev) => [...prev, newComment]);
      setNewCommentInput("");
    } catch (err: any) {
      setTabError(err.message || "Failed to post public comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteInput.trim()) return;

    setNoteSubmitting(true);
    setTabError("");
    try {
      const newNote = await postInternalNote(ticketId, newNoteInput.trim());
      setInternalNotes((prev) => [...prev, newNote]);
      setNewNoteInput("");
    } catch (err: any) {
      setTabError(err.message || "Failed to post internal note.");
    } finally {
      setNoteSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading ticket detail...</span>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container py-4">
        <button type="button" className="btn btn-outline-secondary mb-3" onClick={onBack}>
          ← Back to Queue
        </button>
        <div className="alert alert-danger" role="alert">
          {error || "Ticket not found."}
        </div>
      </div>
    );
  }

  const isStaff = currentUserRole === "IT_STAFF";
  const allowedNextStatuses = ALLOWED_TRANSITIONS[ticket.currentStatus] || [];

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
          ← Back to Ticket Queue
        </button>
        <span className="badge badge-secondary">ID: {ticket.id}</span>
      </div>

      {successBanner && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {successBanner}
          <button type="button" className="btn-close" onClick={() => setSuccessBanner("")}></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}

      {/* Main 2-column Dashboard Grid (desktop ≥ 992px) */}
      <div className="row g-4">
        {/* Left Column: Ticket Metadata & Info */}
        <div className="col-12 col-lg-7">
          <div className="card p-4 surface-card mb-4" style={{ borderColor: "#E2E8F0" }}>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h3 className="mb-0" style={{ color: "#006B3C" }}>{ticket.ticketNumber}</h3>
              <span className="badge badge-pale">{ticket.currentStatus.replace(/_/g, " ")}</span>
            </div>
            <h5 className="mb-3 text-dark">{ticket.summary}</h5>

            <div className="p-3 mb-3 rounded" style={{ backgroundColor: "#F1F5F3" }}>
              <h6 className="text-muted small fw-bold text-uppercase mb-1">Description</h6>
              <p className="mb-0 text-break" style={{ whitespace: "pre-wrap" }}>{ticket.description}</p>
            </div>

            {ticket.resolutionSummary && (
              <div className="p-3 mb-3 rounded border border-success" style={{ backgroundColor: "#EAF6EF" }}>
                <h6 className="text-success small fw-bold text-uppercase mb-1">Resolution Summary</h6>
                <p className="mb-0 text-dark" style={{ whitespace: "pre-wrap" }}>{ticket.resolutionSummary}</p>
              </div>
            )}

            <div className="row g-2 text-muted small border-top pt-3">
              <div className="col-6"><strong>Requester:</strong> {ticket.requester?.name} ({ticket.requester?.email})</div>
              <div className="col-6"><strong>Category:</strong> {ticket.category?.name || "—"}</div>
              <div className="col-6"><strong>Related System:</strong> {ticket.relatedSystem?.name || "—"}</div>
              <div className="col-6"><strong>Created:</strong> {new Date(ticket.createdAt).toLocaleString()}</div>
            </div>
          </div>

          {/* Activity Section: Public Comments, Internal Notes, Attachments */}
          <div className="card surface-card" style={{ borderColor: "#E2E8F0" }}>
            <div className="card-header bg-white border-bottom p-0">
              <ul className="nav nav-tabs card-header-tabs m-0 border-0">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link px-3 py-2 border-0 ${activeTab === "comments" ? "active fw-bold text-success border-bottom border-success border-2" : "text-muted"}`}
                    onClick={() => setActiveTab("comments")}
                  >
                    Public Comments <span className="badge bg-success ms-1">{comments.length}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link px-3 py-2 border-0 ${activeTab === "notes" ? "active fw-bold text-warning border-bottom border-warning border-2" : "text-muted"}`}
                    onClick={() => setActiveTab("notes")}
                  >
                    Internal Notes <span className="badge bg-warning text-dark ms-1">{internalNotes.length}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link px-3 py-2 border-0 ${activeTab === "attachments" ? "active fw-bold text-primary border-bottom border-primary border-2" : "text-muted"}`}
                    onClick={() => setActiveTab("attachments")}
                  >
                    Attachments <span className="badge bg-secondary ms-1">{ticket.attachments?.length || 0}</span>
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body p-3">
              {tabError && <div className="alert alert-danger p-2 small mb-3">{tabError}</div>}

              {/* Public Comments Tab */}
              {activeTab === "comments" && (
                <div>
                  <div className="comments-feed mb-3" style={{ maxHeight: "350px", overflowY: "auto" }}>
                    {comments.length === 0 ? (
                      <p className="text-muted small italic mb-0">No public comments yet.</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="p-3 mb-2 rounded bg-light border">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold small">{c.author?.name || "User"}</span>
                            <span className="badge bg-secondary small">{c.author?.role}</span>
                          </div>
                          <p className="mb-1 small text-dark">{c.content}</p>
                          <span className="text-muted extra-small" style={{ fontSize: "0.75rem" }}>
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handlePostComment}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Write a public comment (3–1000 characters)..."
                        value={newCommentInput}
                        onChange={(e) => setNewCommentInput(e.target.value)}
                        disabled={commentSubmitting}
                      />
                      <button
                        type="submit"
                        className="btn btn-sm btn-zen-primary"
                        disabled={commentSubmitting || newCommentInput.trim().length < 3}
                      >
                        {commentSubmitting ? "Posting..." : "Post Comment"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Internal Notes Tab (Amber Background Shading #FEF3C7 per BR-04, FR-16) */}
              {activeTab === "notes" && (
                <div className="p-3 rounded" style={{ backgroundColor: "#FEF3C7" }}>
                  <div className="notes-feed mb-3" style={{ maxHeight: "350px", overflowY: "auto" }}>
                    {internalNotes.length === 0 ? (
                      <p className="text-muted small italic mb-0">No private internal notes recorded yet.</p>
                    ) : (
                      internalNotes.map((n) => (
                        <div key={n.id} className="p-3 mb-2 rounded bg-white border">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold small text-dark">{n.author?.name || "Staff"}</span>
                            <span className="badge bg-warning text-dark small">{n.author?.role}</span>
                          </div>
                          <p className="mb-1 small text-dark">{n.content}</p>
                          <span className="text-muted extra-small" style={{ fontSize: "0.75rem" }}>
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handlePostNote}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Write private internal note (3–2000 characters)..."
                        value={newNoteInput}
                        onChange={(e) => setNewNoteInput(e.target.value)}
                        disabled={noteSubmitting}
                      />
                      <button
                        type="submit"
                        className="btn btn-sm btn-warning fw-bold text-dark"
                        disabled={noteSubmitting || newNoteInput.trim().length < 3}
                      >
                        {noteSubmitting ? "Saving..." : "Add Note"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === "attachments" && (
                <div>
                  {!ticket.attachments || ticket.attachments.length === 0 ? (
                    <p className="text-muted small italic mb-0">No attachments uploaded for this ticket.</p>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {ticket.attachments.map((att: any) => (
                        <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                          <div>
                            <span className="fw-bold small text-dark">{att.originalName || att.filename}</span>
                            {att.isRemoved ? (
                              <span className="badge bg-danger ms-2">[Soft-Removed]</span>
                            ) : (
                              <span className="text-muted ms-2 extra-small">({Math.round(att.fileSize / 1024)} KB)</span>
                            )}
                            {att.isRemoved && att.removalReason && (
                              <div className="small text-danger fst-italic">Reason: {att.removalReason}</div>
                            )}
                          </div>
                          {!att.isRemoved ? (
                            <a
                              href={`http://localhost:3000/api/attachments/${att.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-outline-primary"
                            >
                              Download
                            </a>
                          ) : (
                            <span className="text-muted small fst-italic">Unavailable (410 Gone)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-muted extra-small mt-3 mb-0">
                    * IT Staff attachment permissions permit downloading active files and viewing soft-removed history. Upload and removal are restricted to ticket owners.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Operational Controls */}
        <div className="col-12 col-lg-5">
          <div className="card p-4 surface-card sticky-lg-top" style={{ top: "1rem", borderColor: "#E2E8F0" }}>
            <h5 className="mb-3 text-dark border-bottom pb-2">Operational Controls</h5>

            {!isStaff && (
              <div className="alert alert-info small p-2 mb-3">
                <strong>Read Oversight Mode:</strong> You are logged in as Administrator. IT Staff operational controls (Claim, Priority, Status) require IT Staff role per SEC-API-04.
              </div>
            )}

            {/* Ownership / Assignment Control */}
            <div className="mb-4">
              <label className="form-label small fw-bold text-muted">Assigned Owner</label>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-bold">
                  {ticket.assignedStaff ? ticket.assignedStaff.name : <span className="text-muted fst-italic">Unassigned</span>}
                </span>
                {isStaff && !ticket.assignedStaff && (
                  <button
                    type="button"
                    className="btn btn-sm btn-zen-primary ms-auto"
                    onClick={handleClaimTicket}
                    disabled={assigning}
                  >
                    {assigning ? "Claiming..." : "Claim Ticket"}
                  </button>
                )}
              </div>

              {isStaff && (
                <div className="input-group input-group-sm">
                  <select
                    className="form-select"
                    value={ticket.assignedStaffId || "unassigned"}
                    onChange={(e) => handleAssignChange(e.target.value)}
                    disabled={assigning}
                  >
                    <option value="unassigned">Unassigned</option>
                    {staffUsers.length > 0
                      ? staffUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} {u.id === currentUserId ? "(Me)" : `(${u.role === "ADMINISTRATOR" ? "Admin" : "IT Staff"})`}
                          </option>
                        ))
                      : currentUserId && <option value={currentUserId}>Assign to Me</option>}
                  </select>
                </div>
              )}
            </div>

            {/* Requested Priority (Read-Only) */}
            <div className="mb-3">
              <label className="form-label small fw-bold text-muted">Requested Priority (Read-Only)</label>
              <input
                type="text"
                className="form-control form-control-sm text-dark fw-bold"
                value={`${ticket.requestedPriority} (Read-Only)`}
                readOnly
                style={{ backgroundColor: "#F1F5F3", borderColor: "#CBD5E1" }}
              />
            </div>

            {/* IT Priority Management */}
            <div className="mb-4">
              <label className="form-label small fw-bold text-muted">IT Priority</label>
              <select
                className="form-select form-select-sm"
                value={selectedPriority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                disabled={!isStaff || priorityUpdating}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* State-Machine Status Transition */}
            <div className="mb-3">
              <form onSubmit={handleStatusSubmit}>
                <label className="form-label small fw-bold text-muted">Update Status</label>
                {allowedNextStatuses.length === 0 ? (
                  <div className="alert alert-secondary small p-2 mb-0">
                    Ticket is in terminal state (<strong>{ticket.currentStatus}</strong>). No status transitions permitted.
                  </div>
                ) : (
                  <>
                    <select
                      className="form-select form-select-sm mb-2"
                      value={selectedStatus}
                      onChange={handleStatusSelectChange}
                      disabled={!isStaff || statusUpdating}
                    >
                      <option value={ticket.currentStatus}>{ticket.currentStatus.replace(/_/g, " ")} (Current)</option>
                      {allowedNextStatuses.map((st) => (
                        <option key={st} value={st}>
                          ➔ Transition to {st.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>

                    {selectedStatus === "RESOLVED" && (
                      <div className="mb-2">
                        <label className="form-label extra-small text-muted fw-bold">Resolution Summary (Optional, up to 1000 chars)</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows={3}
                          placeholder="Describe resolution details..."
                          value={resolutionSummaryInput}
                          onChange={(e) => setResolutionSummaryInput(e.target.value)}
                          maxLength={1000}
                        />
                      </div>
                    )}

                    {isStaff && (
                      <button
                        type="submit"
                        className="btn btn-sm btn-zen-primary w-100 mt-2"
                        disabled={statusUpdating || selectedStatus === ticket.currentStatus}
                      >
                        {statusUpdating
                          ? "Updating Status..."
                          : selectedStatus === ticket.currentStatus
                          ? "Select a Target Status Above"
                          : `Save Transition to ${selectedStatus.replace(/_/g, " ")}`}
                      </button>
                    )}
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for CANCELLED or REOPENED status transitions */}
      {showConfirmationModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Status Change</h5>
                <button type="button" className="btn-close" onClick={() => setShowConfirmationModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Are you sure you want to transition this ticket status to <strong>{pendingStatusChange}</strong>?
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowConfirmationModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-zen-primary btn-sm" onClick={confirmStatusChange}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
