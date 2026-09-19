import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ChangePassword } from "./ChangePassword";

interface AppShellProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentTab, onTabChange, children }) => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  if (!user) return <>{children}</>;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "REQUESTER":
        return <span className="badge ms-2" style={{ backgroundColor: "#EAF6EF", color: "#006B3C" }}>Requester</span>;
      case "IT_STAFF":
        return <span className="badge ms-2" style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}>IT Staff</span>;
      case "ADMINISTRATOR":
        return <span className="badge ms-2" style={{ backgroundColor: "#F3E8FF", color: "#7E22CE" }}>Admin</span>;
      default:
        return null;
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <header className="navbar navbar-expand-lg navbar-dark shadow-sm py-2" style={{ backgroundColor: "#006B3C" }}>
        <div className="container-fluid px-4">
          <a className="navbar-brand d-flex align-items-center fw-bold fs-4" href="#" onClick={(e) => { e.preventDefault(); onTabChange("my-tickets"); }}>
            <span className="me-2">🕒</span> TokTickIT
          </a>

          <div className="navbar-nav me-auto flex-row ms-4">
            {user.role === "REQUESTER" && (
              <>
                <button
                  className={`btn btn-link nav-link me-3 text-white text-decoration-none ${currentTab === "my-tickets" ? "fw-bold border-bottom border-2 border-white" : "opacity-75"}`}
                  onClick={() => onTabChange("my-tickets")}
                >
                  📋 My Tickets
                </button>
                <button
                  className={`btn btn-link nav-link text-white text-decoration-none ${currentTab === "create-ticket" ? "fw-bold border-bottom border-2 border-white" : "opacity-75"}`}
                  onClick={() => onTabChange("create-ticket")}
                >
                  ➕ Create Ticket
                </button>
              </>
            )}

            {user.role === "IT_STAFF" && (
              <button
                className={`btn btn-link nav-link me-3 text-white text-decoration-none ${currentTab === "ticket-queue" ? "fw-bold border-bottom border-2 border-white" : "opacity-75"}`}
                onClick={() => onTabChange("ticket-queue")}
              >
                📥 Ticket Queue
              </button>
            )}

            {user.role === "ADMINISTRATOR" && (
              <button
                className={`btn btn-link nav-link me-3 text-white text-decoration-none ${currentTab === "user-management" ? "fw-bold border-bottom border-2 border-white" : "opacity-75"}`}
                onClick={() => onTabChange("user-management")}
              >
                👥 User Management
              </button>
            )}
          </div>

          <div className="position-relative">
            <button
              className="btn btn-outline-light d-flex align-items-center rounded-pill px-3 py-1"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="User profile menu"
            >
              <span className="fw-medium me-1">👤 Profile: {user.name}</span>
              {getRoleBadge(user.role)}
              <span className="ms-2 small">▼</span>
            </button>


            {showProfileMenu && (
              <div
                className="position-absolute end-0 mt-2 bg-white rounded shadow border py-2 z-3"
                style={{ minWidth: "200px" }}
              >
                <div className="px-3 py-2 border-bottom">
                  <div className="fw-semibold text-dark fs-7">{user.name}</div>
                  <div className="text-muted small">{user.email}</div>
                </div>
                <button
                  className="dropdown-item px-3 py-2 text-dark border-0 bg-transparent w-100 text-start"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowChangePasswordModal(true);
                  }}
                >
                  🔑 Change Password
                </button>
                <div className="dropdown-divider my-1"></div>
                <button
                  className="dropdown-item px-3 py-2 text-danger border-0 bg-transparent w-100 text-start fw-semibold"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow-1">
        {showChangePasswordModal ? (
          <div className="container py-4">
            <button
              className="btn btn-outline-secondary mb-3"
              onClick={() => setShowChangePasswordModal(false)}
            >
              ← Back to Workspace
            </button>
            <ChangePassword onSuccess={() => setShowChangePasswordModal(false)} />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
};
