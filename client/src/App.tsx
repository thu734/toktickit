import { useState } from "react";
import {
  RequesterProvider,
  useRequester,
} from "./context/RequesterContext.js";
import { DevelopmentRequesterSelectionModal } from "./components/DevelopmentRequesterSelectionModal.js";
import { CreateTicketForm } from "./components/CreateTicketForm.js";
import { MyTicketsList } from "./components/MyTicketsList.js";

type TabView = "create-ticket" | "my-tickets";

function MainContent() {
  const { setShowSelectorModal } = useRequester();
  const [activeTab, setActiveTab] = useState<TabView>("create-ticket");

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#F5F7F6" }}>
      {/* Zen Green Application Header matching Reference Illustration strictly */}
      <header className="navbar navbar-expand-lg px-4" style={{ backgroundColor: "#006B3C", color: "#FFFFFF" }}>
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-4">
            {/* Brand Title & Logo */}
            <div className="d-flex align-items-center cursor-pointer" onClick={() => setActiveTab("create-ticket")}>
              <span className="fs-4 me-2">🕒</span>
              <span className="fw-bold fs-5 text-white">TokTickIT</span>
            </div>

            {/* Navigation Items: My Tickets | Create Ticket */}
            <nav className="d-flex align-items-center gap-3 ms-2">
              <button
                type="button"
                className={`btn btn-link text-white text-decoration-none d-flex align-items-center gap-1 px-2 py-1 small ${
                  activeTab === "my-tickets" ? "fw-bold border-bottom border-2 border-white" : "opacity-75"
                }`}
                onClick={() => setActiveTab("my-tickets")}
              >
                <span>📄</span>
                <span>My Tickets</span>
              </button>

              <button
                type="button"
                className={`btn btn-link text-white text-decoration-none d-flex align-items-center gap-1 px-2 py-1 small ${
                  activeTab === "create-ticket" ? "fw-bold border-bottom border-2 border-white" : "opacity-75"
                }`}
                onClick={() => setActiveTab("create-ticket")}
              >
                <span>➕</span>
                <span>Create Ticket</span>
              </button>
            </nav>
          </div>

          {/* Right Profile Element: strictly 'Profile v' opening Requester Selection modal */}
          <div className="d-flex align-items-center">
            <button
              type="button"
              className="btn text-white d-flex align-items-center gap-1 px-2 py-1 opacity-90 border-0 bg-transparent"
              onClick={() => setShowSelectorModal(true)}
              style={{ fontSize: 14 }}
            >
              <span className="fs-6">👤</span>
              <span className="fw-semibold ms-1">Profile</span>
              <span className="small ms-1">∨</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="container py-5" style={{ maxWidth: 960 }}>
        <DevelopmentRequesterSelectionModal />

        {activeTab === "create-ticket" && <CreateTicketForm />}

        {activeTab === "my-tickets" && (
          <MyTicketsList onNavigateCreate={() => setActiveTab("create-ticket")} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <MainContent />
    </RequesterProvider>
  );
}
