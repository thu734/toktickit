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
import { RequesterDashboard } from "./components/RequesterDashboard.js";
import { StaffDashboard } from "./components/StaffDashboard.js";
import type { RequesterTicketFilters, StaffQueueFilters } from "./api.js";
import { UserManagement } from "./components/UserManagement.js";

type TabView = "staff-dashboard" | "requester-dashboard" | "create-ticket" | "my-tickets" | "ticket-detail" | "ticket-queue" | "staff-ticket-detail" | "user-management";

function MainContent() {
  const { user, loading, refreshUser } = useAuth();
  const { activeRequester, setActiveRequester } = useRequester();
  const [activeTab, setActiveTab] = useState<TabView>("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [staffFilters, setStaffFilters] = useState<StaffQueueFilters>();
  const [focusActions, setFocusActions] = useState(false);
  const [requesterFilters, setRequesterFilters] = useState<RequesterTicketFilters>({});

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

    }
  }, [user, activeRequester?.id, setActiveRequester]);

  useEffect(() => {
    if (user) {
      if (user.role === "IT_STAFF") {
        setActiveTab("ticket-queue");
      } else if (user.role === "ADMINISTRATOR") {
        setActiveTab("user-management");
      } else {
        setActiveTab("my-tickets");
      }
    }
  }, [user]);

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

  const handleOpenStaffTicket = (ticketId: number, actions = false) => {
    setFocusActions(actions);
    setSelectedTicketId(ticketId);
    setActiveTab("staff-ticket-detail");
  };

  return (
    <AppShell currentTab={activeTab} onTabChange={(tab) => {
      if (tab === "my-tickets") setRequesterFilters({});
      if (tab === "ticket-queue") setStaffFilters(undefined);
      setActiveTab(tab as TabView);
    }}>
      <div className="container-fluid px-3 px-md-4 px-xl-5 py-4" style={{ maxWidth: 1440 }}>
        {user.role === "REQUESTER" && (
          <>
            {activeTab === "requester-dashboard" && (
              <RequesterDashboard
                onNavigateTickets={(filters) => { setRequesterFilters(filters); setActiveTab("my-tickets"); }}
                onOpenTicket={(id) => { setRequesterFilters({}); handleOpenRequesterTicket(id); }}
                onNavigateCreate={() => setActiveTab("create-ticket")}
              />
            )}
            {activeTab === "create-ticket" && (
              <CreateTicketForm onViewTicketDetail={handleOpenRequesterTicket} />
            )}

            {activeTab === "my-tickets" && (
              <MyTicketsList key={`${user.id}-${JSON.stringify(requesterFilters)}`} initialFilters={requesterFilters}
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
            {activeTab === "staff-dashboard" && <StaffDashboard
              onNavigateTickets={(filters) => { setStaffFilters(filters); setActiveTab("ticket-queue"); }}
              onOpenTicket={handleOpenStaffTicket} />}
            {activeTab === "ticket-queue" && (
              <StaffTicketQueue key={`${user.id}-${JSON.stringify(staffFilters)}`} initialFilters={staffFilters} onOpenTicket={handleOpenStaffTicket} />
            )}

            {activeTab === "staff-ticket-detail" && selectedTicketId !== null && (
              <StaffTicketDetail
                ticketId={selectedTicketId}
                focusActions={focusActions}
                currentUserRole={user.role}
                currentUserId={user.id}
                currentUserName={user.name}
                onBack={() => setActiveTab("ticket-queue")}
              />
            )}
          </>
        )}

        {user.role === "ADMINISTRATOR" && activeTab === "user-management" && (
          <UserManagement />
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
