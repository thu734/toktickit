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

  const loadTicket = useCallback(async (isInitial = false) => {
    if (!activeRequester) {
      setLoading(false);
      return;
    }

    if (isInitial) {
      setLoading(true);
    }
    setError("");

    try {
      const data = await fetchTicketDetail(ticketId, activeRequester.id);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket detail.");
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [ticketId, activeRequester]);

  useEffect(() => {
    loadTicket(true);
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

      {/* Surface Card 1: Read-Only Ticket Information */}
      <section
        className="card border-0 shadow-sm p-4 mb-4"
        style={{
          borderRadius: 12,
          backgroundColor: "#FFFFFF",
        }}
        aria-labelledby="ticket-detail-number"
      >
        {/* Header Bar */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pb-3 border-bottom mb-4 gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h1
              id="ticket-detail-number"
              className="h4 font-monospace fw-bold mb-0"
              style={{ color: "#006B3C" }}
            >
              {ticket.ticketNumber}
            </h1>

            {renderStatusBadge(ticket.currentStatus)}
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm align-self-start align-self-sm-center"
            onClick={onBack}
          >
            &larr; Back to My Tickets
          </button>
        </div>

        {/* Read-Only Ticket Information Card (4-Row Grid Matching Reference) */}
        <div
          className="p-3 p-md-4 rounded mb-4"
          style={{
            backgroundColor: "#F1F5F3",
            border: "1px solid #E2E8F0",
          }}
        >
          {/* Row 1: Ticket Number | Ticket Date | Category | Related System */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6 col-md-3">
              <div className="small text-muted fw-semibold mb-1">Ticket Number</div>
              <div
                className="font-monospace fw-bold"
                style={{ color: "#006B3C", fontSize: "0.95rem" }}
              >
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

          {/* Row 2: Requester | Requested Priority | IT Priority | Current Status */}
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

        {/* Summary & Description Blocks */}
        <div className="d-flex flex-column gap-3">
          <div>
            <div className="small text-muted fw-semibold mb-1">Summary</div>
            <div
              className="fw-semibold text-dark p-3 rounded small"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
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

      {/* Surface Card 2: Ticket Attachments Section */}
      <section
        className="card border-0 shadow-sm p-4"
        style={{
          borderRadius: 12,
          backgroundColor: "#FFFFFF",
        }}
        aria-label="Ticket attachments section"
      >
        <AttachmentSection
          ticketId={ticket.id}
          attachments={ticket.attachments || []}
          onAttachmentChange={() => loadTicket(false)}
        />
      </section>
    </div>
  );
};
