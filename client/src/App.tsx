import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { CreateTicketForm } from "./components/CreateTicketForm.js";
import { MyTicketsList } from "./components/MyTicketsList.js";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail.js";
import { StaffTicketQueue } from "./components/StaffTicketQueue.js";
import { StaffTicketDetail } from "./components/StaffTicketDetail.js";

type TabView = "create-ticket" | "my-tickets" | "ticket-detail" | "ticket-queue" | "staff-ticket-detail" | "user-management";

function MainContent() {
  const { user, loading, refreshUser } = useAuth();
  const { activeRequester, setActiveRequester } = useRequester();
  const [activeTab, setActiveTab] = useState<TabView>("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      if (activeRequester?.id !== user.id) {
        setActiveRequester({
          id: user.id,
          name: user.name,
          email: user.email,
          department: "General",
        });
      }

      if (user.role === "IT_STAFF") {
        setActiveTab("ticket-queue");
      } else if (user.role === "ADMINISTRATOR") {
        setActiveTab("user-management");
      } else {
        setActiveTab("my-tickets");
      }
    }
  }, [user, activeRequester?.id, setActiveRequester]);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-success mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="fw-semibold text-secondary">Loading TokTickIT...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.mustChangePassword) {
    return <ChangePassword onSuccess={() => refreshUser()} />;
  }

  const handleOpenRequesterTicket = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setActiveTab("ticket-detail");
  };

  const handleOpenStaffTicket = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setActiveTab("staff-ticket-detail");
  };

  return (
    <AppShell currentTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TabView)}>
      <div className="container-fluid px-3 px-md-4 px-xl-5 py-4" style={{ maxWidth: 1440 }}>
        {user.role === "REQUESTER" && (
          <>
            {activeTab === "create-ticket" && (
              <CreateTicketForm onViewTicketDetail={handleOpenRequesterTicket} />
            )}

            {activeTab === "my-tickets" && (
              <MyTicketsList
                onNavigateCreate={() => setActiveTab("create-ticket")}
                onOpenTicket={handleOpenRequesterTicket}
              />
            )}

            {activeTab === "ticket-detail" && selectedTicketId !== null && (
              <RequesterTicketDetail
                ticketId={selectedTicketId}
                onBack={() => setActiveTab("my-tickets")}
              />
            )}
          </>
        )}

        {(user.role === "IT_STAFF" || user.role === "ADMINISTRATOR") && (
          <>
            {activeTab === "ticket-queue" && (
              <StaffTicketQueue onOpenTicket={handleOpenStaffTicket} />
            )}

            {activeTab === "staff-ticket-detail" && selectedTicketId !== null && (
              <StaffTicketDetail
                ticketId={selectedTicketId}
                currentUserRole={user.role}
                currentUserId={user.id}
                onBack={() => setActiveTab("ticket-queue")}
              />
            )}
          </>
        )}

        {user.role === "ADMINISTRATOR" && activeTab === "user-management" && (
          <div className="container py-5 text-center">
            <div className="card shadow-sm border-0 p-5 mx-auto" style={{ maxWidth: 600 }}>
              <div className="fs-1 mb-3">👥</div>
              <h3 className="fw-bold text-dark">Administrator User Management</h3>
              <p className="text-muted mb-0">
                Administrator user management, account creation, and password reset operations are scheduled for <strong>Issue #16</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <MainContent />
      </RequesterProvider>
    </AuthProvider>
  );
}
