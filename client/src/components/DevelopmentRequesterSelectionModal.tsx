import React, { useEffect, useState } from "react";
import { fetchRequesters, DevelopmentRequester } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

export const DevelopmentRequesterSelectionModal: React.FC = () => {
  const { activeRequester, setActiveRequester, showSelectorModal, setShowSelectorModal } =
    useRequester();

  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const loadRequesters = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchRequesters();
      setRequesters(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (_err) {
      setError("Failed to load development requesters. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showSelectorModal) {
      loadRequesters();
    }
  }, [showSelectorModal]);

  if (!showSelectorModal) {
    return null;
  }

  const handleContinue = () => {
    const selected = requesters.find((r) => r.id === Number(selectedId));
    if (selected) {
      setActiveRequester(selected);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 600 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
          {/* Top Breadcrumb Header */}
          <div className="px-4 pt-3 pb-2 text-muted small border-bottom">
            <span>🏠 Home</span> &gt; <span className="fw-semibold">Development Requester Selection</span>
          </div>

          <div className="modal-body p-4 text-center">
            {/* Header Icon */}
            <div
              className="d-inline-flex align-items-center justify-content-center mb-3"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor: "#EAF6EF",
                color: "#006B3C",
                fontSize: 28,
              }}
            >
              👤⚙️
            </div>

            {/* Title & Subtitle */}
            <h2 className="h4 fw-bold mb-2" style={{ color: "#1E2923" }}>
              Select Development Requester
            </h2>
            <p className="text-muted small mb-4 px-3">
              Choose a development requester to simulate the current requester context for Lab 2.
              This is for testing only and is not a login screen.
            </p>

            {error ? (
              <div className="alert alert-danger py-2 small mb-3">
                {error}
                <button
                  className="btn btn-sm btn-outline-danger ms-2 py-0"
                  onClick={loadRequesters}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {/* Dropdown Control */}
            <div className="text-start mb-3">
              <label htmlFor="requesterSelect" className="form-label small fw-semibold">
                Development Requester <span style={{ color: "#D92D20" }}>*</span>
              </label>
              <select
                id="requesterSelect"
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                disabled={loading || requesters.length === 0}
                style={{ height: 42 }}
              >
                {loading ? (
                  <option>Loading requesters...</option>
                ) : requesters.length === 0 ? (
                  <option>No active development requesters available</option>
                ) : (
                  requesters.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Info Callout Banner */}
            <div
              className="p-2 mb-3 rounded text-start small d-flex align-items-center"
              style={{ backgroundColor: "#EAF6EF", border: "1px solid #C6E7D2", color: "#006B3C" }}
            >
              <span className="me-2">ℹ️</span>
              <span>Only active development requesters are shown.</span>
            </div>

            {/* Shield Disclaimer Card */}
            <div
              className="p-3 rounded text-start mb-4"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <div className="d-flex align-items-start">
                <span className="me-2" style={{ fontSize: 18 }}>🛡️</span>
                <div>
                  <div className="fw-semibold small" style={{ color: "#1E2923" }}>
                    Authentication coming in Lab 3
                  </div>
                  <div className="text-muted small" style={{ fontSize: 12 }}>
                    In Lab 3, this selection will be replaced with secure authentication so you can
                    access the system with your own account.
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={() => {
                  if (activeRequester) {
                    setShowSelectorModal(false);
                  }
                }}
                disabled={!activeRequester}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn px-4 text-white fw-semibold"
                style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                onClick={handleContinue}
                disabled={loading || !selectedId || requesters.length === 0}
              >
                ➔ Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
