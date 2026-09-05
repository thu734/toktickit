import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchTickets,
  fetchCategories,
  Category,
  PaginatedTicketsResponse,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

interface MyTicketsListProps {
  onNavigateCreate?: () => void;

  // Issue #8 can connect this to Requester Ticket Detail.
  // Issue #7 does not implement Ticket Detail itself.
  onOpenTicket?: (ticketId: number) => void;
}

const PAGE_LIMIT = 10;

export const MyTicketsList: React.FC<MyTicketsListProps> = ({
  onNavigateCreate,
  onOpenTicket,
}) => {
  const { activeRequester } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

  const [ticketsData, setTicketsData] =
    useState<PaginatedTicketsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("ALL");

  /*
   * Lab 2 tickets begin with NEW and lifecycle changes are explicitly
   * out of scope. Keep the state so the API contract can support the
   * documented Current Status filter, but do not introduce future
   * lifecycle values into the UI.
   */
  const [currentStatus, setCurrentStatus] = useState("ALL");

  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  /*
   * Reference data
   */
  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError("");

      try {
        const data = await fetchCategories();

        if (!cancelled) {
          setCategories(data);
        }
      } catch {
        if (!cancelled) {
          setCategoriesError(
            "Categories could not be loaded. Category filtering is temporarily unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Requester-owned ticket list
   */
  const loadTickets = useCallback(async () => {
    if (!activeRequester) {
      setTicketsData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchTickets(
        {
          search: appliedSearch || undefined,
          categoryId: categoryId || undefined,
          requestedPriority:
            requestedPriority !== "ALL" ? requestedPriority : undefined,
          currentStatus: currentStatus !== "ALL" ? currentStatus : undefined,
          sortBy,
          sortOrder,
          page,
          limit: PAGE_LIMIT,
        },
        activeRequester.id
      );

      setTicketsData(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load tickets.";

      setError(message);
      setTicketsData(null);
    } finally {
      setLoading(false);
    }
  }, [
    activeRequester,
    appliedSearch,
    categoryId,
    requestedPriority,
    currentStatus,
    sortBy,
    sortOrder,
    page,
  ]);

  /*
   * Re-load automatically when requester or query changes.
   */
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  /*
   * When requester changes, return to page 1.
   */
  useEffect(() => {
    setPage(1);
  }, [activeRequester?.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setCategoryId("");
    setRequestedPriority("ALL");
    setCurrentStatus("ALL");
    setPage(1);
  };

  const handleSortToggle = (field: string) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
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

  const totalPages = ticketsData?.pagination.totalPages ?? 0;

  const items = ticketsData?.items ?? [];

  /*
   * Compact timestamp for list view.
   * Full timestamp can appear in Ticket Detail later.
   */
  const formatCompactDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) {
      return (
        <span
          aria-hidden="true"
          style={{ opacity: 0.5, color: "#006B3C" }}
        >
          ↕
        </span>
      );
    }

    return <span aria-hidden="true" style={{ color: "#006B3C" }}>{sortOrder === "asc" ? "▲" : "▼"}</span>;
  };

  const renderPriorityBadge = (priority: string) => {
    const commonStyle: React.CSSProperties = {
      fontSize: "0.72rem",
      fontWeight: 500,
      minWidth: "62px",
      textAlign: "center",
      display: "inline-block",
      borderRadius: "16px",
      padding: "2px 10px",
    };

    switch (priority) {
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
            className="badge rounded-pill border"
            style={{
              ...commonStyle,
              backgroundColor: "#FEE2E2",
              borderColor: "#FCA5A5",
              color: "#DC2626",
            }}
          >
            HIGH
          </span>
        );

      case "LOW":
        return (
          <span
            className="badge rounded-pill border"
            style={{
              ...commonStyle,
              backgroundColor: "#EAF6EF",
              borderColor: "#C6E7D2",
              color: "#006B3C",
            }}
          >
            LOW
          </span>
        );

      case "MEDIUM":
      default:
        return (
          <span
            className="badge rounded-pill border"
            style={{
              ...commonStyle,
              backgroundColor: "#FEF3C7",
              borderColor: "#FDE68A",
              color: "#D97706",
            }}
          >
            MEDIUM
          </span>
        );
    }
  };

  const renderStatusBadge = (status: string) => {
    const commonStyle: React.CSSProperties = {
      fontSize: "0.72rem",
      fontWeight: 500,
      minWidth: "60px",
      textAlign: "center",
      display: "inline-block",
      borderRadius: "16px",
      padding: "2px 10px",
    };

    switch (status) {
      case "NEW":
        return (
          <span
            className="badge rounded-pill border"
            style={{
              ...commonStyle,
              backgroundColor: "#EAF6EF",
              borderColor: "#C6E7D2",
              color: "#006B3C",
              fontWeight: 600,
            }}
          >
            NEW
          </span>
        );

      case "OPEN":
        return (
          <span
            className="badge rounded-pill border"
            style={{
              ...commonStyle,
              backgroundColor: "#EFF6FF",
              borderColor: "#BFDBFE",
              color: "#2563EB",
            }}
          >
            OPEN
          </span>
        );

      case "IN_PROGRESS":
        return (
          <span
            className="badge rounded-pill border"
            style={{
              ...commonStyle,
              backgroundColor: "#EAF6EF",
              borderColor: "#C6E7D2",
              color: "#006B3C",
            }}
          >
            IN_PROGRESS
          </span>
        );

      case "PENDING":
        return (
          <span
            className="badge rounded-pill border"
            style={{
              ...commonStyle,
              backgroundColor: "#FEF3C7",
              borderColor: "#FDE68A",
              color: "#D97706",
            }}
          >
            PENDING
          </span>
        );

      case "RESOLVED":
        return (
          <span
            className="badge rounded-pill border"
            style={{
              ...commonStyle,
              backgroundColor: "#EAF6EF",
              borderColor: "#C6E7D2",
              color: "#006B3C",
            }}
          >
            RESOLVED
          </span>
        );

      case "CLOSED":
        return (
          <span
            className="badge rounded-pill border"
            style={{
              ...commonStyle,
              backgroundColor: "#F1F5F9",
              borderColor: "#E2E8F0",
              color: "#475569",
            }}
          >
            CLOSED
          </span>
        );

      default:
        return (
          <span
            className="badge rounded-pill bg-light text-dark border"
            style={commonStyle}
          >
            {status}
          </span>
        );
    }
  };

  const paginationPages = useMemo(() => {
    if (totalPages <= 0) {
      return [];
    }

    const start = Math.max(1, Math.min(page - 2, totalPages - 4));

    const end = Math.min(totalPages, start + 4);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  /*
   * App-level Requester Selection should normally prevent this state,
   * but My Tickets still fails safely.
   */
  if (!activeRequester) {
    return (
      <section
        className="card border-0 shadow-sm p-4 text-center"
        style={{ borderRadius: 12 }}
      >
        <h1 className="h4 fw-semibold mb-2" style={{ color: "#1E2923" }}>
          Development Requester Required
        </h1>

        <p className="text-muted mb-0">
          Select a Development Requester before opening My Tickets.
        </p>
      </section>
    );
  }

  return (
    <section
      className="card border-0 shadow-sm p-3 p-md-4"
      style={{
        borderRadius: 12,
        width: "100%",
      }}
      aria-labelledby="my-tickets-heading"
    >
      {/* Page heading */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-3 mb-4">
        <div>
          <h1
            id="my-tickets-heading"
            className="h4 fw-semibold mb-1"
            style={{ color: "#1E2923" }}
          >
            My Tickets
          </h1>

          <p className="text-muted small mb-0">
            View and track all of your support requests.
          </p>
        </div>

        {onNavigateCreate && (
          <button
            type="button"
            className="btn text-white fw-semibold px-3 py-2 align-self-start"
            style={{
              backgroundColor: "#006B3C",
            }}
            onClick={onNavigateCreate}
          >
            + Create Ticket
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div
        className="p-3 mb-4 rounded"
        style={{
          backgroundColor: "#F5F7F6",
          border: "1px solid #DDE5E1",
        }}
      >
        <form onSubmit={handleSearchSubmit}>
          <div className="row g-3 align-items-end">
            {/* Search */}
            <div className="col-12 col-lg-4">
              <label
                htmlFor="ticket-search"
                className="form-label small fw-semibold mb-1"
              >
                Search
              </label>

              <div>
                <input
                  id="ticket-search"
                  type="search"
                  className="form-control"
                  placeholder="🔍 Search ticket #, summary..."
                  value={searchInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchInput(val);
                    setAppliedSearch(val.trim());
                    setPage(1);
                  }}
                />

                <button
                  type="submit"
                  className="visually-hidden"
                  aria-label="Search"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Category */}
            <div className="col-12 col-sm-6 col-lg-2">
              <label
                htmlFor="ticket-category-filter"
                className="form-label small fw-semibold mb-1"
              >
                Category
              </label>

              <select
                id="ticket-category-filter"
                className="form-select"
                value={categoryId}
                disabled={categoriesLoading || Boolean(categoriesError)}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">
                  {categoriesLoading ? "Loading..." : "All Categories"}
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="col-12 col-sm-6 col-lg-2">
              <label
                htmlFor="ticket-priority-filter"
                className="form-label small fw-semibold mb-1"
              >
                Requested Priority
              </label>

              <select
                id="ticket-priority-filter"
                className="form-select"
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

            {/* Current Status */}
            <div className="col-12 col-sm-6 col-lg-2">
              <label
                htmlFor="ticket-status-filter"
                className="form-label small fw-semibold mb-1"
              >
                Current Status
              </label>

              <select
                id="ticket-status-filter"
                className="form-select"
                value={currentStatus}
                onChange={(e) => {
                  setCurrentStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Statuses</option>

                {/* Lab 2 lifecycle stops at NEW */}
                <option value="NEW">New</option>
              </select>
            </div>

            {/* Clear */}
            <div className="col-12 col-sm-6 col-lg-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters && !searchInput}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </form>

        {categoriesError && (
          <p className="small text-danger mt-2 mb-0" role="alert">
            {categoriesError}
          </p>
        )}
      </div>

      {/* Ticket API failure */}
      {error && !loading && (
        <div className="alert alert-danger" role="alert">
          <div className="fw-semibold mb-1">Tickets could not be loaded</div>

          <div className="small mb-3">{error}</div>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={loadTickets}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-5" aria-live="polite">
          <div className="spinner-border text-success mb-3" role="status">
            <span className="visually-hidden">Loading tickets</span>
          </div>

          <p className="text-muted small mb-0">Loading your tickets...</p>
        </div>
      ) : error ? null : totalItems === 0 ? (
        hasActiveFilters ? (
          /* No results */
          <div
            className="text-center py-5 px-3 rounded"
            style={{
              backgroundColor: "#F5F7F6",
            }}
          >
            <h2 className="h5 fw-semibold mb-2" style={{ color: "#1E2923" }}>
              No Tickets Found
            </h2>

            <p className="text-muted small mb-3">
              No tickets match your search or filter criteria.
            </p>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* True empty list */
          <div
            className="text-center py-5 px-3 rounded"
            style={{
              backgroundColor: "#F5F7F6",
            }}
          >
            <h2 className="h5 fw-semibold mb-2" style={{ color: "#1E2923" }}>
              No Tickets Yet
            </h2>

            <p className="text-muted small mb-3">
              You have not submitted any IT tickets yet.
            </p>

            {onNavigateCreate && (
              <button
                type="button"
                className="btn text-white fw-semibold"
                style={{
                  backgroundColor: "#006B3C",
                }}
                onClick={onNavigateCreate}
              >
                + Create Ticket
              </button>
            )}
          </div>
        )
      ) : (
        <>
          {/* ======================================================
              DESKTOP >= 992px
              Compact table, no horizontal scrolling.
             ====================================================== */}
          <div className="d-none d-lg-block mx-n3 mx-md-n4">
            <table
              className="table table-hover align-middle mb-0"
              style={{
                width: "100%",
                tableLayout: "fixed",
                fontSize: "0.78rem",
              }}
            >
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>

              <thead
                style={{
                  backgroundColor: "#EAF6EF",
                  color: "#006B3C",
                  fontSize: "0.76rem",
                }}
              >
                <tr className="fw-semibold border-bottom" style={{ borderColor: "#C6E7D2" }}>
                  <th scope="col" className="ps-3 ps-md-4 pe-2 py-2.5">
                    <button
                      type="button"
                      className="btn btn-link p-0 border-0 text-decoration-none fw-semibold d-inline-flex align-items-center gap-1"
                      style={{
                        color: "#006B3C",
                        fontSize: "inherit",
                      }}
                      onClick={() => handleSortToggle("ticketNumber")}
                    >
                      <span>Ticket No.</span>
                      {renderSortIndicator("ticketNumber")}
                    </button>
                  </th>

                  <th scope="col" className="px-2 py-2.5">
                    <button
                      type="button"
                      className="btn btn-link p-0 border-0 text-decoration-none fw-semibold d-inline-flex align-items-center gap-1"
                      style={{
                        color: "#006B3C",
                        fontSize: "inherit",
                      }}
                      onClick={() => handleSortToggle("createdAt")}
                    >
                      <span>Created Date</span>
                      {renderSortIndicator("createdAt")}
                    </button>
                  </th>

                  <th scope="col" className="px-2 py-2.5 fw-semibold" style={{ color: "#006B3C" }}>
                    Summary
                  </th>

                  <th scope="col" className="px-2 py-2.5 fw-semibold" style={{ color: "#006B3C" }}>
                    Category
                  </th>

                  <th scope="col" className="px-2 py-2.5 fw-semibold" style={{ color: "#006B3C" }}>
                    Related System
                  </th>

                  <th scope="col" className="px-2 py-2.5">
                    <button
                      type="button"
                      className="btn btn-link p-0 border-0 text-decoration-none fw-semibold d-inline-flex align-items-center gap-1"
                      style={{
                        color: "#006B3C",
                        fontSize: "inherit",
                      }}
                      onClick={() => handleSortToggle("requestedPriority")}
                    >
                      <span>Requested Priority</span>
                      {renderSortIndicator("requestedPriority")}
                    </button>
                  </th>

                  <th scope="col" className="px-2 py-2.5 fw-semibold" style={{ color: "#006B3C" }}>
                    Current Status
                  </th>

                  <th scope="col" className="ps-2 pe-3 py-2.5">
                    <button
                      type="button"
                      className="btn btn-link p-0 border-0 text-decoration-none fw-semibold d-inline-flex align-items-center gap-1"
                      style={{
                        color: "#006B3C",
                        fontSize: "inherit",
                      }}
                      onClick={() => handleSortToggle("updatedAt")}
                    >
                      <span>Last Updated</span>
                      {renderSortIndicator("updatedAt")}
                    </button>
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((ticket) => (
                  <tr
                    key={ticket.id}
                    style={{
                      cursor: onOpenTicket ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (onOpenTicket) {
                        onOpenTicket(ticket.id);
                      }
                    }}
                  >
                    {/* Ticket Number / open */}
                    <td className="ps-3 ps-md-4 pe-2 py-2 text-nowrap">
                      {onOpenTicket ? (
                        <button
                          type="button"
                          className="btn btn-link p-0 border-0 text-decoration-none font-monospace fw-semibold text-start"
                          style={{
                            color: "#006B3C",
                            fontSize: "inherit",
                          }}
                          onClick={() => onOpenTicket(ticket.id)}
                        >
                          {ticket.ticketNumber}
                        </button>
                      ) : (
                        <span
                          className="font-monospace fw-semibold"
                          style={{
                            color: "#006B3C",
                          }}
                        >
                          {ticket.ticketNumber}
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td
                      className="px-2 py-2 text-muted text-nowrap"
                      style={{ fontSize: "0.74rem" }}
                    >
                      {formatCompactDateTime(ticket.createdAt)}
                    </td>

                    {/* Summary */}
                    <td className="px-2 py-2">
                      <div
                        className="text-truncate"
                        title={ticket.summary}
                        style={{
                          color: "#1E2923",
                          fontWeight: 400,
                        }}
                      >
                        {ticket.summary}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-2 py-2 text-muted">
                      <div
                        className="text-truncate"
                        title={ticket.category?.name || "—"}
                      >
                        {ticket.category?.name || "—"}
                      </div>
                    </td>

                    {/* System */}
                    <td className="px-2 py-2 text-muted">
                      <div
                        className="text-truncate"
                        title={ticket.relatedSystem?.name || "—"}
                      >
                        {ticket.relatedSystem?.name || "—"}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="px-2 py-2 text-nowrap">
                      {renderPriorityBadge(ticket.requestedPriority)}
                    </td>

                    {/* Status */}
                    <td className="px-2 py-2 text-nowrap">
                      {renderStatusBadge(ticket.currentStatus)}
                    </td>

                    {/* Last update */}
                    <td
                      className="ps-2 pe-3 py-2 text-muted text-nowrap"
                      style={{
                        fontSize: "0.74rem",
                      }}
                    >
                      {formatCompactDateTime(ticket.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ======================================================
              TABLET 768-991px
              Two-column card layout where practical.
             ====================================================== */}
          <div className="d-none d-md-block d-lg-none">
            <div className="row g-3">
              {items.map((ticket) => (
                <div key={ticket.id} className="col-6">
                  <TicketCard
                    ticket={ticket}
                    formatCompactDateTime={formatCompactDateTime}
                    renderPriorityBadge={renderPriorityBadge}
                    renderStatusBadge={renderStatusBadge}
                    onOpenTicket={onOpenTicket}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ======================================================
              MOBILE <768px
             ====================================================== */}
          <div className="d-md-none">
            <div className="d-flex flex-column gap-3">
              {items.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  formatCompactDateTime={formatCompactDateTime}
                  renderPriorityBadge={renderPriorityBadge}
                  renderStatusBadge={renderStatusBadge}
                  onOpenTicket={onOpenTicket}
                />
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mt-4 pt-3 border-top">
            <div className="small text-muted">
              Showing {(page - 1) * PAGE_LIMIT + 1} to{" "}
              {Math.min(page * PAGE_LIMIT, totalItems)} of {totalItems} tickets
            </div>

            <nav
              aria-label="My Tickets pagination"
              className="d-flex flex-wrap gap-1"
            >
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>

              {paginationPages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  aria-current={pageNumber === page ? "page" : undefined}
                  className={
                    pageNumber === page
                      ? "btn btn-sm text-white"
                      : "btn btn-sm btn-outline-secondary"
                  }
                  style={
                    pageNumber === page
                      ? {
                          backgroundColor: "#006B3C",
                          borderColor: "#006B3C",
                        }
                      : undefined
                  }
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Next
              </button>
            </nav>
          </div>
        </>
      )}
    </section>
  );
};

/*
 * Reusable tablet/mobile representation.
 */
interface TicketCardProps {
  ticket: any;
  formatCompactDateTime: (dateStr?: string) => string;
  renderPriorityBadge: (priority: string) => React.ReactNode;
  renderStatusBadge: (status: string) => React.ReactNode;
  onOpenTicket?: (ticketId: number) => void;
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  formatCompactDateTime,
  renderPriorityBadge,
  renderStatusBadge,
  onOpenTicket,
}) => {
  return (
    <article
      className="h-100 p-3 rounded border"
      style={{
        backgroundColor: "#FFFFFF",
      }}
    >
      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
        {onOpenTicket ? (
          <button
            type="button"
            className="btn btn-link p-0 border-0 text-decoration-none font-monospace fw-semibold text-start"
            style={{
              color: "#006B3C",
              fontSize: "0.82rem",
            }}
            onClick={() => onOpenTicket(ticket.id)}
          >
            {ticket.ticketNumber}
          </button>
        ) : (
          <span
            className="font-monospace fw-semibold"
            style={{
              color: "#006B3C",
              fontSize: "0.82rem",
            }}
          >
            {ticket.ticketNumber}
          </span>
        )}

        {renderStatusBadge(ticket.currentStatus)}
      </div>

      <h2
        className="h6 fw-normal mb-3"
        style={{
          color: "#1E2923",
          lineHeight: 1.4,
        }}
      >
        {ticket.summary}
      </h2>

      <dl className="row small mb-0">
        <dt className="col-5 fw-semibold">Category</dt>
        <dd className="col-7 text-muted">{ticket.category?.name || "—"}</dd>

        <dt className="col-5 fw-semibold">Related System</dt>
        <dd className="col-7 text-muted">
          {ticket.relatedSystem?.name || "—"}
        </dd>

        <dt className="col-5 fw-semibold">Requested Priority</dt>
        <dd className="col-7">
          {renderPriorityBadge(ticket.requestedPriority)}
        </dd>

        <dt className="col-5 fw-semibold">Last Updated</dt>
        <dd className="col-7 text-muted">
          {formatCompactDateTime(ticket.updatedAt)}
        </dd>
      </dl>

      {onOpenTicket && (
        <button
          type="button"
          className="btn btn-sm mt-3"
          style={{
            color: "#0B7A46",
            borderColor: "#0B7A46",
          }}
          onClick={() => onOpenTicket(ticket.id)}
        >
          Open Ticket
        </button>
      )}
    </article>
  );
};
