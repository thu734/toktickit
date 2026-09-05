import React, { useCallback, useEffect, useState } from "react";
import { fetchTicketDetail, TicketDetail } from "../api.js";
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

  const loadTicket = useCallback(async () => {
    if (!activeRequester) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchTicketDetail(ticketId, activeRequester.id);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket detail.");
    } finally {
      setLoading(false);
    }
  }, [ticketId, activeRequester]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

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
          <span
            className="badge rounded-pill"
            style={{ ...commonStyle, backgroundColor: "#EAF6EF", color: "#006B3C" }}
          >
            NEW
          </span>
        );
      case "OPEN":
        return (
          <span
            className="badge rounded-pill"
            style={{ ...commonStyle, backgroundColor: "#EFF6FF", color: "#2563EB" }}
          >
            OPEN
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span
            className="badge rounded-pill"
            style={{ ...commonStyle, backgroundColor: "#EAF6EF", color: "#006B3C" }}
          >
            IN PROGRESS
          </span>
        );
      case "PENDING":
        return (
          <span
            className="badge rounded-pill"
            style={{ ...commonStyle, backgroundColor: "#FEF3C7", color: "#D97706" }}
          >
            PENDING
          </span>
        );
      case "RESOLVED":
        return (
          <span
            className="badge rounded-pill"
            style={{ ...commonStyle, backgroundColor: "#EAF6EF", color: "#006B3C" }}
          >
            RESOLVED
          </span>
        );
      default:
        return (
          <span
            className="badge rounded-pill"
            style={{ ...commonStyle, backgroundColor: "#F1F5F9", color: "#475569" }}
          >
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
      case "UNASSIGNED":
        return (
          <span
            className="badge rounded-pill"
            style={{
              ...commonStyle,
              backgroundColor: "#F1F5F9",
              color: "#475569",
              border: "1px solid #CBD5E1",
            }}
          >
            UNASSIGNED
          </span>
        );
      case "URGENT":
        return (
          <span
            className="badge rounded-pill text-white"
            style={{ ...commonStyle, backgroundColor: "#7F1D1D" }}
          >
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span
            className="badge rounded-pill"
            style={{
              ...commonStyle,
              backgroundColor: "#FEE2E2",
              color: "#DC2626",
              border: "1px solid #FCA5A5",
            }}
          >
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span
            className="badge rounded-pill"
            style={{
              ...commonStyle,
              backgroundColor: "#FEF3C7",
              color: "#D97706",
              border: "1px solid #FDE68A",
            }}
          >
            MEDIUM
          </span>
        );
      default:
        return (
          <span
            className="badge rounded-pill"
            style={{
              ...commonStyle,
              backgroundColor: "#EAF6EF",
              color: "#006B3C",
              border: "1px solid #C6E7D2",
            }}
          >
            LOW
          </span>
        );
    }
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
    <div
      className="container py-3"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb navigation" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none text-muted"
              onClick={onBack}
            >
              My Tickets
            </button>
          </li>
          <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
            Ticket Details ({ticket.ticketNumber})
          </li>
        </ol>
      </nav>

      {/* Main Ticket Card Surface */}
      <section
        className="card border-0 shadow-sm p-4"
        style={{
          borderRadius: 12,
          backgroundColor: "#FFFFFF",
        }}
        aria-labelledby="ticket-detail-number"
      >
        {/* Header Bar */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-3 pb-3 border-bottom mb-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h1
                id="ticket-detail-number"
                className="h4 font-monospace fw-bold mb-0"
                style={{ color: "#006B3C" }}
              >
                {ticket.ticketNumber}
              </h1>

              {renderStatusBadge(ticket.currentStatus)}
            </div>

            <h2 className="h5 fw-semibold mb-0 mt-2" style={{ color: "#1E2923" }}>
              {ticket.summary}
            </h2>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm align-self-start"
            onClick={onBack}
          >
            &larr; Back to My Tickets
          </button>
        </div>

        {/* Read-Only Metadata Details Grid */}
        <div
          className="p-3 rounded mb-4"
          style={{
            backgroundColor: "#F1F5F3",
            border: "1px solid #E2E8F0",
          }}
        >
          <dl className="row mb-0 small">
            <dt className="col-12 col-sm-3 text-muted fw-semibold mb-1">Category</dt>
            <dd className="col-12 col-sm-3 mb-2 mb-sm-0">{ticket.category?.name || "—"}</dd>

            <dt className="col-12 col-sm-3 text-muted fw-semibold mb-1">Related System</dt>
            <dd className="col-12 col-sm-3 mb-2 mb-sm-0">{ticket.relatedSystem?.name || "—"}</dd>

            <dt className="col-12 col-sm-3 text-muted fw-semibold mb-1 mt-sm-2">
              Requested Priority
            </dt>
            <dd className="col-12 col-sm-3 mb-2 mb-sm-0 mt-sm-2">
              {renderPriorityBadge(ticket.requestedPriority)}
            </dd>

            <dt className="col-12 col-sm-3 text-muted fw-semibold mb-1 mt-sm-2">
              IT Priority (Read-Only)
            </dt>
            <dd className="col-12 col-sm-3 mb-2 mb-sm-0 mt-sm-2">
              {renderPriorityBadge(ticket.itPriority)}
            </dd>

            <dt className="col-12 col-sm-3 text-muted fw-semibold mb-1 mt-sm-2">Created Date</dt>
            <dd className="col-12 col-sm-3 text-muted mb-2 mb-sm-0 mt-sm-2">
              {formatDate(ticket.createdAt)}
            </dd>

            <dt className="col-12 col-sm-3 text-muted fw-semibold mb-1 mt-sm-2">Last Updated</dt>
            <dd className="col-12 col-sm-3 text-muted mb-0 mt-sm-2">
              {formatDate(ticket.updatedAt)}
            </dd>
          </dl>
        </div>

        {/* Full Ticket Description */}
        <div className="mb-4">
          <h3 className="h6 fw-semibold mb-2" style={{ color: "#1E2923" }}>
            Description
          </h3>

          <div
            className="p-3 rounded small"
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              whiteSpace: "pre-wrap",
              color: "#1E2923",
              lineHeight: 1.6,
            }}
          >
            {ticket.description}
          </div>
        </div>

        {/* Attachment Section Component */}
        <AttachmentSection
          ticketId={ticket.id}
          attachments={ticket.attachments || []}
          onAttachmentChange={loadTicket}
        />
      </section>
    </div>
  );
};
