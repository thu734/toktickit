import React, { useEffect, useState, useCallback } from "react";
import {
  fetchTickets,
  fetchCategories,
  Category,
  Ticket,
  PaginatedTicketsResponse,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

interface MyTicketsListProps {
  onNavigateCreate?: () => void;
}

export const MyTicketsList: React.FC<MyTicketsListProps> = ({ onNavigateCreate }) => {
  const { activeRequester } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketsData, setTicketsData] = useState<PaginatedTicketsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Toolbar & Query States
  const [searchInput, setSearchInput] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<string>("ALL");
  const [currentStatus, setCurrentStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);

  // Load reference categories once
  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data))
      .catch(() => {});
  }, []);

  // Fetch tickets query function
  const loadTickets = useCallback(async () => {
    if (!activeRequester) return;

    setLoading(true);
    setError("");

    try {
      const data = await fetchTickets(
        {
          search: appliedSearch,
          categoryId: categoryId || undefined,
          requestedPriority: requestedPriority !== "ALL" ? requestedPriority : undefined,
          currentStatus: currentStatus !== "ALL" ? currentStatus : undefined,
          sortBy,
          sortOrder,
          page,
          limit: 10,
        },
        activeRequester.id
      );
      setTicketsData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [activeRequester, appliedSearch, categoryId, requestedPriority, currentStatus, sortBy, sortOrder, page]);

  // Re-fetch tickets on query change or requester identity switch (AC-12, UI-03)
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Execute search on Enter or Search button click
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setCategoryId("");
    setRequestedPriority("ALL");
    setCurrentStatus("ALL");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  // Toggle Column Sort Order
  const handleSortToggle = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(appliedSearch) ||
    Boolean(categoryId) ||
    requestedPriority !== "ALL" ||
    currentStatus !== "ALL";

  const totalItems = ticketsData?.pagination.totalItems ?? 0;
  const totalPages = ticketsData?.pagination.totalPages ?? 1;
  const items = ticketsData?.items ?? [];

  // Format Helper for Dates
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Priority Badge Styling
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">URGENT</span>;
      case "HIGH":
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1">HIGH</span>;
      case "LOW":
        return <span className="badge bg-secondary-subtle text-secondary px-2 py-1">LOW</span>;
      default:
        return <span className="badge bg-info-subtle text-info-emphasis px-2 py-1">MEDIUM</span>;
    }
  };

  // Status Badge Styling
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="badge text-success border px-2 py-1" style={{ backgroundColor: "#EAF6EF", borderColor: "#C6E7D2" }}>NEW</span>;
      case "OPEN":
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">OPEN</span>;
      case "RESOLVED":
        return <span className="badge bg-success text-white px-2 py-1">RESOLVED</span>;
      case "CLOSED":
        return <span className="badge bg-secondary text-white px-2 py-1">CLOSED</span>;
      default:
        return <span className="badge bg-light text-dark border px-2 py-1">{status}</span>;
    }
  };

  return (
    <div className="card border-0 shadow-sm p-4" style={{ borderRadius: 12 }}>
      {/* Title Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: "#1E2923" }}>
            My IT Tickets
          </h2>
          <p className="text-muted small mb-0">
            View and track requests submitted under your development requester context.
          </p>
        </div>
        {onNavigateCreate && (
          <button
            type="button"
            className="btn text-white fw-semibold small px-3 py-2"
            style={{ backgroundColor: "#006B3C" }}
            onClick={onNavigateCreate}
          >
            + Create Ticket
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3 mb-4 rounded" style={{ backgroundColor: "#F5F7F6", border: "1px solid #E2E8F0" }}>
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          {/* Search Bar */}
          <div className="col-lg-4 col-md-6">
            <div className="input-group input-group-sm">
              <input
                type="text"
                className="form-control"
                placeholder="Search ticket #, summary..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button
                type="submit"
                className="btn text-white px-3"
                style={{ backgroundColor: "#006B3C" }}
              >
                🔍 Search
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="col-lg-2 col-md-3 col-6">
            <select
              className="form-select form-select-sm"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="col-lg-2 col-md-3 col-6">
            <select
              className="form-select form-select-sm"
              value={requestedPriority}
              onChange={(e) => {
                setRequestedPriority(e.target.value);
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

          {/* Status Filter */}
          <div className="col-lg-2 col-md-3 col-6">
            <select
              className="form-select form-select-sm"
              value={currentStatus}
              onChange={(e) => {
                setCurrentStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Clear Filters Action */}
          <div className="col-lg-2 col-md-3 col-6 text-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters && !searchInput}
            >
              Clear Filters
            </button>
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger py-2 small mb-4">
          🚨 {error}
        </div>
      )}

      {/* Loading Spinner State */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success mb-2" role="status"></div>
          <p className="text-muted small">Loading your tickets...</p>
        </div>
      ) : totalItems === 0 ? (
        /* Empty State vs No-Results State Distinction (AC-15, AC-16, UI-09, UI-10) */
        hasActiveFilters ? (
          /* No-Results State Card (AC-16, UI-10) */
          <div className="text-center py-5 px-3 rounded" style={{ backgroundColor: "#F5F7F6" }}>
            <div className="fs-1 text-muted mb-2">🔍</div>
            <h3 className="h5 fw-bold mb-1" style={{ color: "#1E2923" }}>
              No Tickets Found
            </h3>
            <p className="text-muted small mb-3">
              No tickets match your search or filter criteria.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary px-3"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* True Empty State Card (AC-15, UI-09) */
          <div className="text-center py-5 px-3 rounded" style={{ backgroundColor: "#F5F7F6" }}>
            <div className="fs-1 text-muted mb-2">📄</div>
            <h3 className="h5 fw-bold mb-1" style={{ color: "#1E2923" }}>
              No Tickets Yet
            </h3>
            <p className="text-muted small mb-3">
              You have not submitted any IT tickets under this requester context.
            </p>
            {onNavigateCreate && (
              <button
                type="button"
                className="btn text-white fw-semibold small px-4 py-2"
                style={{ backgroundColor: "#006B3C" }}
                onClick={onNavigateCreate}
              >
                + Create Ticket
              </button>
            )}
          </div>
        )
      ) : (
        <>
          {/* Desktop Table View (≥ 992 px) */}
          <div className="d-none d-lg-block table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light small">
                <tr>
                  <th
                    scope="col"
                    className="cursor-pointer"
                    onClick={() => handleSortToggle("ticketNumber")}
                  >
                    Ticket Number {sortBy === "ticketNumber" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th scope="col">Summary</th>
                  <th scope="col">Category</th>
                  <th scope="col">Related System</th>
                  <th
                    scope="col"
                    className="cursor-pointer"
                    onClick={() => handleSortToggle("requestedPriority")}
                  >
                    Priority {sortBy === "requestedPriority" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th scope="col">Status</th>
                  <th
                    scope="col"
                    className="cursor-pointer"
                    onClick={() => handleSortToggle("createdAt")}
                  >
                    Created Date {sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <span className="font-monospace fw-bold" style={{ color: "#006B3C" }}>
                        {ticket.ticketNumber}
                      </span>
                    </td>
                    <td className="fw-semibold text-truncate" style={{ maxWidth: 240 }}>
                      {ticket.summary}
                    </td>
                    <td className="small text-muted">{ticket.category?.name || "—"}</td>
                    <td className="small text-muted">{ticket.relatedSystem?.name || "—"}</td>
                    <td>{renderPriorityBadge(ticket.requestedPriority)}</td>
                    <td>{renderStatusBadge(ticket.currentStatus)}</td>
                    <td className="small text-muted">{formatDate(ticket.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tablet & Mobile Card List View (< 992 px) */}
          <div className="d-lg-none d-flex flex-column gap-3">
            {items.map((ticket) => (
              <div
                key={ticket.id}
                className="p-3 rounded border"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="font-monospace fw-bold small" style={{ color: "#006B3C" }}>
                    {ticket.ticketNumber}
                  </span>
                  {renderStatusBadge(ticket.currentStatus)}
                </div>
                <h4 className="h6 fw-bold mb-2" style={{ color: "#1E2923" }}>
                  {ticket.summary}
                </h4>
                <div className="d-flex flex-wrap gap-2 align-items-center mb-2 small text-muted">
                  <span>📂 {ticket.category?.name || "—"}</span>
                  <span>•</span>
                  <span>💻 {ticket.relatedSystem?.name || "—"}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center pt-2 border-top small">
                  <div>{renderPriorityBadge(ticket.requestedPriority)}</div>
                  <div className="text-muted">{formatDate(ticket.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top small text-muted">
            <div>
              Showing {items.length > 0 ? (page - 1) * 10 + 1 : 0} to{" "}
              {Math.min(page * 10, totalItems)} of {totalItems} tickets
            </div>
            <div className="d-flex gap-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn btn-sm ${
                    p === page ? "btn-success text-white" : "btn-outline-secondary"
                  }`}
                  style={p === page ? { backgroundColor: "#006B3C", borderColor: "#006B3C" } : {}}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
