import React, { useCallback, useEffect, useState } from "react";
import {
  fetchTicketDetail,
  TicketDetail,
  Comment,
  fetchTicketComments,
  postTicketComment,
  indicateTicketResolved,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";
import { AttachmentSection } from "./AttachmentSection.js";

interface RequesterTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export const RequesterTicketDetail: React.FC<RequesterTicketDetailProps> = ({
  ticketId,
  onBack,
}) => {
  const { activeRequester } = useRequester();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Public Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  // Resolution indication modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveCommentText, setResolveCommentText] = useState("");
  const [submittingResolve, setSubmittingResolve] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [resolveSuccess, setResolveSuccess] = useState("");

  const loadTicket = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    setError("");

    try {
      const data = await fetchTicketDetail(ticketId, 0);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket detail.");
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [ticketId]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const data = await fetchTicketComments(ticketId);
      setComments(data);
    } catch (err: any) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket(true);
    loadComments();
  }, [loadTicket, loadComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError("");

    const trimmed = newCommentText.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 1000) {
      setCommentError("Comment must be between 3 and 1000 characters.");
      return;
    }

    setPostingComment(true);
    try {
      const created = await postTicketComment(ticketId, trimmed);
      setComments((prev) => [...prev, created]);
      setNewCommentText("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  };

  const handleIndicateResolved = async (e: React.FormEvent) => {
    e.preventDefault();
    setResolveError("");
    setResolveSuccess("");

    const trimmed = resolveCommentText.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 1000) {
      setResolveError("Resolution comment must be between 3 and 1000 characters.");
      return;
    }

    setSubmittingResolve(true);
    try {
      const res = await indicateTicketResolved(ticketId, trimmed);
      setComments((prev) => [...prev, res.comment]);
      setResolveCommentText("");
      setShowResolveModal(false);
      setResolveSuccess("Problem resolution indication submitted to IT Staff.");
    } catch (err: any) {
      setResolveError(err.message || "Failed to submit resolution indication.");
    } finally {
      setSubmittingResolve(false);
    }
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
      hour12: true,
    }).format(date);
  };

  const renderStatusBadge = (status: string) => {
    const commonStyle: React.CSSProperties = {
      fontSize: "0.75rem",
      fontWeight: 600,
      borderRadius: "16px",
      padding: "3px 12px",
      display: "inline-block",
    };

    switch (status) {
      case "NEW":
        return (
          <span className="badge rounded-pill" style={{ ...commonStyle, backgroundColor: "#EAF6EF", color: "#006B3C" }}>
            NEW
          </span>
        );
      case "OPEN":
        return (
          <span className="badge rounded-pill" style={{ ...commonStyle, backgroundColor: "#EFF6FF", color: "#2563EB" }}>
            OPEN
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="badge rounded-pill" style={{ ...commonStyle, backgroundColor: "#EAF6EF", color: "#006B3C" }}>
            IN PROGRESS
          </span>
        );
      case "WAITING_FOR_REQUESTER":
      case "PENDING":
        return (
          <span className="badge rounded-pill" style={{ ...commonStyle, backgroundColor: "#FEF3C7", color: "#D97706" }}>
            WAITING FOR REQUESTER
          </span>
        );
      case "RESOLVED":
        return (
          <span className="badge rounded-pill" style={{ ...commonStyle, backgroundColor: "#EAF6EF", color: "#006B3C" }}>
            RESOLVED
          </span>
        );
      default:
        return (
          <span className="badge rounded-pill" style={{ ...commonStyle, backgroundColor: "#F1F5F9", color: "#475569" }}>
            {status}
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: string) => {
    const commonStyle: React.CSSProperties = {
      fontSize: "0.75rem",
      fontWeight: 500,
      borderRadius: "16px",
      padding: "3px 12px",
      display: "inline-block",
    };

    switch (priority) {
      case "URGENT":
        return (
          <span className="badge rounded-pill text-white" style={{ ...commonStyle, backgroundColor: "#7F1D1D" }}>
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="badge rounded-pill" style={{ ...commonStyle, backgroundColor: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="badge rounded-pill" style={{ ...commonStyle, backgroundColor: "#FEF3C7", color: "#D97706", border: "1px solid #FDE68A" }}>
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="badge rounded-pill" style={{ ...commonStyle, backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #C6E7D2" }}>
            LOW
          </span>
        );
    }
  };

  const renderRoleBadge = (role: string) => {
    if (role === "IT_STAFF") {
      return <span className="badge bg-primary ms-2 small">IT Staff</span>;
    }
    if (role === "ADMINISTRATOR") {
      return <span className="badge bg-purple ms-2 small" style={{ backgroundColor: "#7E22CE" }}>Admin</span>;
    }
    return <span className="badge bg-secondary ms-2 small">Requester</span>;
  };

  if (loading) {
    return (
      <div className="text-center py-5" aria-live="polite">
        <div className="spinner-border text-success mb-3" role="status">
          <span className="visually-hidden">Loading ticket details</span>
        </div>
        <p className="text-muted small mb-0">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="alert alert-danger my-4" role="alert">
        <h2 className="h6 fw-semibold mb-1">Unable to load ticket details</h2>
        <p className="small mb-3">{error || "Ticket not found or access denied."}</p>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onBack}>
          &larr; Back to My Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="container py-3" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb navigation" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <button type="button" className="btn btn-link p-0 text-decoration-none text-muted" onClick={onBack}>
              My Tickets
            </button>
          </li>
          <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
            Ticket Details ({ticket.ticketNumber})
          </li>
        </ol>
      </nav>

      {resolveSuccess && (
        <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
          <strong>✓ Submitted:</strong> {resolveSuccess}
          <button type="button" className="btn-close" onClick={() => setResolveSuccess("")} aria-label="Close"></button>
        </div>
      )}

      {/* Surface Card 1: Read-Only Ticket Information */}
      <section className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: 12, backgroundColor: "#FFFFFF" }} aria-labelledby="ticket-detail-number">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pb-3 border-bottom mb-4 gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h1 id="ticket-detail-number" className="h4 font-monospace fw-bold mb-0" style={{ color: "#006B3C" }}>
              {ticket.ticketNumber}
            </h1>
            {renderStatusBadge(ticket.currentStatus)}
          </div>

          <div className="d-flex gap-2 flex-wrap align-items-center">
            <button
              type="button"
              className="btn btn-outline-success btn-sm fw-semibold"
              onClick={() => setShowResolveModal(true)}
            >
              ✓ Problem Appears Resolved
            </button>

            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
              &larr; Back to My Tickets
            </button>
          </div>
        </div>

        {/* Read-Only Ticket Info Grid */}
        <div className="p-3 p-md-4 rounded mb-4" style={{ backgroundColor: "#F1F5F3", border: "1px solid #E2E8F0" }}>
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6 col-md-3">
              <div className="small text-muted fw-semibold mb-1">Ticket Number</div>
              <div className="font-monospace fw-bold" style={{ color: "#006B3C", fontSize: "0.95rem" }}>
                {ticket.ticketNumber}
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <div className="small text-muted fw-semibold mb-1">Ticket Date</div>
              <div className="small text-dark">{formatDate(ticket.createdAt)}</div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <div className="small text-muted fw-semibold mb-1">Category</div>
              <div className="small text-dark">{ticket.category?.name || "—"}</div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <div className="small text-muted fw-semibold mb-1">Related System</div>
              <div className="small text-dark">{ticket.relatedSystem?.name || "—"}</div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-sm-6 col-md-3">
              <div className="small text-muted fw-semibold mb-1">Requester</div>
              <div className="small text-dark">{ticket.requester?.name || "—"}</div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <div className="small text-muted fw-semibold mb-1">Requested Priority</div>
              <div>{renderPriorityBadge(ticket.requestedPriority)}</div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <div className="small text-muted fw-semibold mb-1">IT Priority (Read-Only)</div>
              <div>{renderPriorityBadge(ticket.itPriority)}</div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <div className="small text-muted fw-semibold mb-1">Current Status</div>
              <div>{renderStatusBadge(ticket.currentStatus)}</div>
            </div>
          </div>
        </div>

        {/* Summary & Description */}
        <div className="d-flex flex-column gap-3">
          <div>
            <div className="small text-muted fw-semibold mb-1">Summary</div>
            <div className="fw-semibold text-dark p-3 rounded small" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              {ticket.summary}
            </div>
          </div>

          <div>
            <div className="small text-muted fw-semibold mb-1">Description</div>
            <div
              className="p-3 rounded small"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                whiteSpace: "pre-wrap",
                color: "#1E2923",
                lineHeight: 1.6,
              }}
            >
              {ticket.description}
            </div>
          </div>
        </div>
      </section>

      {/* Surface Card 2: Attachments */}
      <section className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: 12, backgroundColor: "#FFFFFF" }}>
        <AttachmentSection ticketId={ticket.id} attachments={ticket.attachments || []} onAttachmentChange={() => loadTicket(false)} />
      </section>

      {/* Surface Card 3: Public Comments Feed */}
      <section className="card border-0 shadow-sm p-4" style={{ borderRadius: 12, backgroundColor: "#FFFFFF" }}>
        <h2 className="h5 fw-bold mb-3" style={{ color: "#006B3C" }}>
          💬 Public Comments ({comments.length})
        </h2>

        {loadingComments ? (
          <div className="text-center py-3 text-muted small">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="p-3 text-center text-muted small bg-light rounded mb-4">
            No public comments posted yet.
          </div>
        ) : (
          <div className="d-flex flex-column gap-3 mb-4">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 rounded border" style={{ backgroundColor: "#F8FAFC" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-semibold small text-dark">
                    {comment.author?.name || "User"}
                    {renderRoleBadge(comment.author?.role || "")}
                  </div>
                  <div className="small text-muted">{formatDate(comment.createdAt)}</div>
                </div>
                <div className="small text-dark" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {comment.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Post Comment Form */}
        <form onSubmit={handlePostComment} className="border-top pt-3">
          <label htmlFor="newComment" className="form-label fw-semibold small">
            Add Public Comment <span className="text-muted font-normal">(3–1000 characters)</span>
          </label>

          {commentError && <div className="alert alert-danger p-2 small mb-2">{commentError}</div>}

          <div className="mb-2">
            <textarea
              id="newComment"
              className="form-control form-control-sm"
              rows={3}
              placeholder="Type your comment here..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              disabled={postingComment}
              maxLength={1000}
            ></textarea>
            <div className="d-flex justify-content-between text-muted small mt-1">
              <span>Publicly visible to IT Staff and Administrators</span>
              <span>{newCommentText.length}/1000</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-sm btn-primary fw-semibold"
            style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
            disabled={postingComment || newCommentText.trim().length < 3}
          >
            {postingComment ? "Posting..." : "Post Comment"}
          </button>
        </form>
      </section>

      {/* Problem Appears Resolved Modal */}
      {showResolveModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ backgroundColor: "#006B3C" }}>
                <h5 className="modal-title h6 fw-bold">Indicate Problem Appears Resolved</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowResolveModal(false)}></button>
              </div>
              <form onSubmit={handleIndicateResolved}>
                <div className="modal-body">
                  <p className="small text-muted mb-3">
                    Please provide details explaining how the issue appears resolved. This resolution comment will be sent to IT Staff for review.
                  </p>

                  {resolveError && <div className="alert alert-danger p-2 small mb-2">{resolveError}</div>}

                  <div className="mb-3">
                    <label htmlFor="resolveComment" className="form-label fw-semibold small">
                      Resolution Comment <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="resolveComment"
                      className="form-control"
                      rows={4}
                      placeholder="Describe what resolved the issue..."
                      value={resolveCommentText}
                      onChange={(e) => setResolveCommentText(e.target.value)}
                      disabled={submittingResolve}
                      required
                      minLength={3}
                      maxLength={1000}
                    ></textarea>
                    <div className="text-end text-muted small mt-1">{resolveCommentText.length}/1000</div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowResolveModal(false)} disabled={submittingResolve}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-success" style={{ backgroundColor: "#006B3C" }} disabled={submittingResolve || resolveCommentText.trim().length < 3}>
                    {submittingResolve ? "Submitting..." : "Submit Resolution Comment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
