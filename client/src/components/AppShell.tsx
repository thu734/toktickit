import React, { useState, useRef, useEffect } from "react";
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

  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutPending = useRef(false);
  const handleLogout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true; setLoggingOut(true); setLogoutError(''); setShowProfileMenu(false);
    try { await logout(); }
    catch { setLogoutError('Unable to sign out. Your session may still be active. Please retry.'); }
    finally { logoutPending.current = false; setLoggingOut(false); }
  };

  const profileTrigger = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    // Navigation replaces content without changing the URL: place keyboard
    // focus on the new page heading once asynchronous content arrives.
    const focusHeading = () => {
      if (main.current?.contains(document.activeElement) && document.activeElement !== main.current) return true;
      const heading = main.current?.querySelector<HTMLElement>('h1');
      if (!heading) return false;
      heading.tabIndex = -1; heading.focus(); return true;
    };
    if (focusHeading()) return;
    const observer = new MutationObserver(() => { if (focusHeading()) observer.disconnect(); });
    if (main.current) observer.observe(main.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [currentTab, showChangePasswordModal]);

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
    <div className="app-shell d-flex flex-column min-vh-100 bg-light">
      <header className="navbar navbar-expand-lg navbar-dark shadow-sm py-2" style={{ backgroundColor: "#006B3C" }}>
        <div className="container-fluid px-4">
          <a className="navbar-brand d-flex align-items-center fw-bold fs-4" href="#" onClick={(e) => { e.preventDefault(); onTabChange(user.role === "REQUESTER" ? "my-tickets" : user.role === "ADMINISTRATOR" ? "user-management" : "ticket-queue"); }}>
            <span className="me-2">🕒</span> TokTickIT
          </a>

          <nav aria-label="Main navigation" className="navbar-nav me-auto flex-row ms-4">
            {user.role === "REQUESTER" && (
              <>
                <button
                  className={`btn btn-link nav-link me-3 text-white text-decoration-none ${currentTab === "requester-dashboard" ? "fw-bold border-bottom border-2 border-white" : ""}`}
                  aria-current={currentTab === "requester-dashboard" ? "page" : undefined}
                  onClick={() => onTabChange("requester-dashboard")}
                >
                  Dashboard
                </button>
                <button
                  className={`btn btn-link nav-link me-3 text-white text-decoration-none ${currentTab === "my-tickets" ? "fw-bold border-bottom border-2 border-white" : ""}`}
                  aria-current={currentTab === "my-tickets" ? "page" : undefined}
                  onClick={() => onTabChange("my-tickets")}
                >
                  📋 My Tickets
                </button>
                <button
                  className={`btn btn-link nav-link text-white text-decoration-none ${currentTab === "create-ticket" ? "fw-bold border-bottom border-2 border-white" : ""}`}
                  aria-current={currentTab === "create-ticket" ? "page" : undefined}
                  onClick={() => onTabChange("create-ticket")}
                >
                  ➕ Create Ticket
                </button>
              </>
            )}

            {(user.role === "IT_STAFF" || user.role === "ADMINISTRATOR") && (
              <button className={`btn btn-link nav-link me-3 text-white text-decoration-none ${currentTab === "staff-dashboard" ? "fw-bold border-bottom border-2 border-white" : ""}`}
                aria-current={currentTab === "staff-dashboard" ? "page" : undefined} onClick={() => onTabChange("staff-dashboard")}>
                Dashboard
              </button>
            )}

            {user.role === "IT_STAFF" && (
              <button
                className={`btn btn-link nav-link me-3 text-white text-decoration-none ${currentTab === "ticket-queue" ? "fw-bold border-bottom border-2 border-white" : ""}`}
                aria-current={currentTab === "ticket-queue" ? "page" : undefined}
                  onClick={() => onTabChange("ticket-queue")}
              >
                📥 Ticket Queue
              </button>
            )}

            {user.role === "ADMINISTRATOR" && (
              <>
                <button
                  className={`btn btn-link nav-link me-3 text-white text-decoration-none ${currentTab === "ticket-queue" ? "fw-bold border-bottom border-2 border-white" : ""}`}
                  aria-current={currentTab === "ticket-queue" ? "page" : undefined}
                  onClick={() => onTabChange("ticket-queue")}
                >
                  📥 Ticket Queue
                </button>
                <button
                  className={`btn btn-link nav-link me-3 text-white text-decoration-none ${currentTab === "user-management" ? "fw-bold border-bottom border-2 border-white" : ""}`}
                  aria-current={currentTab === "user-management" ? "page" : undefined}
                  onClick={() => onTabChange("user-management")}
                >
                  👥 User Management
                </button>
              </>
            )}
          </nav>

          <div className="position-relative profile-container" onKeyDown={event => {
            if (event.key === "Escape" && showProfileMenu) { setShowProfileMenu(false); profileTrigger.current?.focus(); }
          }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setShowProfileMenu(false); }}>
            <button
              ref={profileTrigger}
              aria-expanded={showProfileMenu} aria-controls="profile-disclosure"
              className="profile-trigger btn btn-outline-light d-flex align-items-center rounded-pill px-3 py-1"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="User profile menu"
            >
              <span className="fw-medium me-1">👤 Profile: {user.name}</span>
              {getRoleBadge(user.role)}
              <span className="ms-2 small">▼</span>
            </button>


            {showProfileMenu && (
              <div
                id="profile-disclosure"
                className="profile-disclosure position-absolute end-0 mt-2 bg-white rounded shadow border py-2 z-3"
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
                  disabled={loggingOut}
                  onClick={() => { void handleLogout(); }}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {logoutError && <div role="alert" className="alert alert-danger mx-3 mt-3">
        {logoutError} <button className="btn btn-outline-danger" disabled={loggingOut} onClick={() => void handleLogout()}>Retry sign out</button>
      </div>}

      <main ref={main} className="flex-grow-1">
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
