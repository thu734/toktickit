import React, { useEffect, useState, useCallback } from "react";
import {
  fetchStaffTickets,
  fetchCategories,
  Category,
  PaginatedTicketsResponse,
} from "../api.js";

interface StaffTicketQueueProps {
  onOpenTicket?: (ticketId: number) => void;
}

export const StaffTicketQueue: React.FC<StaffTicketQueueProps> = ({ onOpenTicket }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketsData, setTicketsData] = useState<PaginatedTicketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itPriority, setItPriority] = useState("ALL");
  const [currentStatus, setCurrentStatus] = useState("ALL");
  const [assignedStaffFilter, setAssignedStaffFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchCategories()
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]));
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchStaffTickets({
        search: appliedSearch || undefined,
        categoryId: categoryId !== "" ? categoryId : undefined,
        itPriority: itPriority !== "ALL" ? itPriority : undefined,
        currentStatus: currentStatus !== "ALL" ? currentStatus : undefined,
        assignedStaffId: assignedStaffFilter !== "ALL" ? assignedStaffFilter : undefined,
        sortBy,
        sortOrder,
        page,
        limit: 10,
      });
      setTicketsData(res);
    } catch (err: any) {
      if (err?.status === 403) {
        setError("Access Denied: IT Staff authorization required.");
      } else {
        setError(err.message || "Unable to load ticket queue. Please refresh.");
      }
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, categoryId, itPriority, currentStatus, assignedStaffFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setCategoryId("");
    setItPriority("ALL");
    setCurrentStatus("ALL");
    setAssignedStaffFilter("ALL");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const isFilterActive =
    appliedSearch !== "" ||
    categoryId !== "" ||
    itPriority !== "ALL" ||
    currentStatus !== "ALL" ||
    assignedStaffFilter !== "ALL";

  const renderPriorityBadge = (priority: string) => {
    const style: React.CSSProperties = {
      fontSize: "0.75rem",
      fontWeight: 600,
      borderRadius: "16px",
      padding: "3px 10px",
      display: "inline-block",
    };
    switch (priority) {
      case "URGENT":
        return <span className="badge text-white" style={{ ...style, backgroundColor: "#7F1D1D" }}>URGENT</span>;
      case "HIGH":
        return <span className="badge" style={{ ...style, backgroundColor: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5" }}>HIGH</span>;
      case "MEDIUM":
        return <span className="badge" style={{ ...style, backgroundColor: "#FEF3C7", color: "#D97706", border: "1px solid #FDE68A" }}>MEDIUM</span>;
      case "LOW":
        return <span className="badge" style={{ ...style, backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #C6E7D2" }}>LOW</span>;
      default:
        return <span className="badge" style={{ ...style, backgroundColor: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1" }}>{priority}</span>;
    }
  };

  const renderStatusBadge = (status: string) => {
    const style: React.CSSProperties = {
      fontSize: "0.75rem",
      fontWeight: 600,
      borderRadius: "16px",
      padding: "3px 10px",
      display: "inline-block",
    };
    switch (status) {
      case "NEW":
        return <span className="badge" style={{ ...style, backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #C6E7D2" }}>NEW</span>;
      case "OPEN":
        return <span className="badge" style={{ ...style, backgroundColor: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>OPEN</span>;
      case "IN_PROGRESS":
        return <span className="badge" style={{ ...style, backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #C6E7D2" }}>IN PROGRESS</span>;
      case "WAITING_FOR_REQUESTER":
        return <span className="badge" style={{ ...style, backgroundColor: "#FEF3C7", color: "#D97706", border: "1px solid #FDE68A" }}>WAITING FOR REQUESTER</span>;
      case "RESOLVED":
        return <span className="badge" style={{ ...style, backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #C6E7D2" }}>RESOLVED</span>;
      case "CANCELLED":
      case "CLOSED":
        return <span className="badge" style={{ ...style, backgroundColor: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1" }}>{status.replace(/_/g, " ")}</span>;
      case "REOPENED":
        return <span className="badge" style={{ ...style, backgroundColor: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5" }}>REOPENED</span>;
      default:
        return <span className="badge" style={{ ...style, backgroundColor: "#F1F5F9", color: "#475569" }}>{status}</span>;
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1" style={{ color: "#006B3C" }}>IT Support Ticket Queue</h2>
          <p className="text-muted small mb-0">Shared operational queue for IT Staff & Administrators</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="card p-3 mb-4 surface-card" style={{ borderColor: "#E2E8F0" }}>
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label small fw-bold text-muted">Search Queue</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Ticket #, summary, or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="btn btn-zen-primary">
                Search
              </button>
            </div>
          </div>

          <div className="col-6 col-md-2">
            <label className="form-label small fw-bold text-muted">Category</label>
            <select
              className="form-select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <label className="form-label small fw-bold text-muted">IT Priority</label>
            <select
              className="form-select"
              value={itPriority}
              onChange={(e) => {
                setItPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <label className="form-label small fw-bold text-muted">Status</label>
            <select
              className="form-select"
              value={currentStatus}
              onChange={(e) => {
                setCurrentStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <label className="form-label small fw-bold text-muted">Assignment</label>
            <select
              className="form-select"
              value={assignedStaffFilter}
              onChange={(e) => {
                setAssignedStaffFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Tickets</option>
              <option value="unassigned">Unassigned Only</option>
            </select>
          </div>
        </form>

        <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted fw-bold">Sort by:</span>
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="createdAt">Created Date</option>
              <option value="updatedAt">Updated Date</option>
              <option value="itPriority">IT Priority</option>
              <option value="currentStatus">Status</option>
              <option value="ticketNumber">Ticket Number</option>
            </select>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            >
              {sortOrder === "asc" ? "▲ Asc" : "▼ Desc"}
            </button>
          </div>

          {isFilterActive && (
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none text-muted"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Queue Content */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading ticket queue...</span>
          </div>
        </div>
      ) : !ticketsData || ticketsData.items.length === 0 ? (
        <div className="text-center py-5 card p-4 surface-card" style={{ borderColor: "#E2E8F0" }}>
          {isFilterActive ? (
            <>
              <h5 className="text-muted">No tickets match your filter criteria.</h5>
              <button
                type="button"
                className="btn btn-zen-primary mt-2"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </>
          ) : (
            <h5 className="text-muted">No IT support tickets in queue.</h5>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table (≥ 992px) */}
          <div className="d-none d-lg-block card surface-card mb-3" style={{ borderColor: "#E2E8F0" }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ backgroundColor: "#F5F7F6" }}>
                  <tr>
                    <th>Ticket #</th>
                    <th>Created Date</th>
                    <th>Summary</th>
                    <th>Requester</th>
                    <th>Category</th>
                    <th>IT Priority</th>
                    <th>Status</th>
                    <th>Assigned Owner</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsData.items.map((ticket: any) => (
                    <tr key={ticket.id}>
                      <td className="fw-bold" style={{ color: "#006B3C" }}>
                        {ticket.ticketNumber}
                      </td>
                      <td className="small text-muted">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ maxWidth: "240px" }} className="text-truncate">
                        {ticket.summary}
                      </td>
                      <td className="small">{ticket.requester?.name || ticket.requester?.email || "—"}</td>
                      <td className="small">{ticket.category?.name || "—"}</td>
                      <td>
                        {renderPriorityBadge(ticket.itPriority)}
                      </td>
                      <td>
                        {renderStatusBadge(ticket.currentStatus)}
                      </td>
                      <td className="small">
                        {ticket.assignedStaff ? (
                          <span className="fw-bold text-dark">{ticket.assignedStaff.name}</span>
                        ) : (
                          <span className="text-muted fst-italic">Unassigned</span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-zen-primary"
                          onClick={() => onOpenTicket && onOpenTicket(ticket.id)}
                        >
                          Open Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards (< 992px) */}
          <div className="d-lg-none row g-3 mb-3">
            {ticketsData.items.map((ticket: any) => (
              <div className="col-12" key={ticket.id}>
                <div className="card p-3 surface-card" style={{ borderColor: "#E2E8F0" }}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="fw-bold" style={{ color: "#006B3C" }}>
                      {ticket.ticketNumber}
                    </span>
                    <div className="d-flex gap-1">
                      {renderStatusBadge(ticket.currentStatus)}
                      {renderPriorityBadge(ticket.itPriority)}
                    </div>
                  </div>
                  <h6 className="mb-2">{ticket.summary}</h6>
                  <div className="small text-muted mb-2">
                    <div><strong>Requester:</strong> {ticket.requester?.name || "—"}</div>
                    <div><strong>Category:</strong> {ticket.category?.name || "—"}</div>
                    <div>
                      <strong>Owner:</strong>{" "}
                      {ticket.assignedStaff ? ticket.assignedStaff.name : <span className="fst-italic">Unassigned</span>}
                    </div>
                    <div><strong>Created:</strong> {new Date(ticket.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-zen-primary w-100 mt-1"
                    onClick={() => onOpenTicket && onOpenTicket(ticket.id)}
                  >
                    Open Detail
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {ticketsData.pagination.totalItems > 0 && (
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-3 pt-3 border-top gap-2">
              <span className="small text-muted">
                Showing page <strong>{ticketsData.pagination.page}</strong> of <strong>{ticketsData.pagination.totalPages}</strong> ({ticketsData.pagination.totalItems} total tickets)
              </span>
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page >= ticketsData.pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(ticketsData.pagination.totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
