import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import {
  RequesterProvider,
  useRequester,
} from "./context/RequesterContext.js";
import { DevelopmentRequesterSelectionModal } from "./components/DevelopmentRequesterSelectionModal.js";

type UiState = "idle" | "loading" | "success" | "error";

function MainContent() {
  const { activeRequester, setShowSelectorModal } = useRequester();
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleCheck() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await checkSystem();
      setCategories(res.categories);
      setState("success");
    } catch (_err: any) {
      setErrorMsg("Unable to connect to TokTickIT API");
      setState("error");
    }
  }

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#F5F7F6" }}>
      {/* Zen Green Application Header */}
      <header className="navbar navbar-expand-lg px-4" style={{ backgroundColor: "#006B3C", color: "#FFFFFF" }}>
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <span className="fs-4 me-2">🕒</span>
            <span className="fw-bold fs-5 text-white">TokTickIT</span>
          </div>

          <div className="d-flex align-items-center">
            {activeRequester ? (
              <button
                className="btn btn-sm btn-light d-flex align-items-center gap-1 rounded-pill px-3"
                onClick={() => setShowSelectorModal(true)}
              >
                <span>👤</span>
                <span className="fw-semibold">{activeRequester.name}</span>
                <span className="small text-muted ms-1">▼</span>
              </button>
            ) : (
              <button
                className="btn btn-sm btn-light rounded-pill px-3"
                onClick={() => setShowSelectorModal(true)}
              >
                Select Requester Context
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="container py-5" style={{ maxWidth: 800 }}>
        <DevelopmentRequesterSelectionModal />

        <div className="card shadow-sm border-0 p-4" style={{ borderRadius: 10 }}>
          <h1 className="h4 mb-3" style={{ color: "#1E2923" }}>
            TokTickIT <span style={{ color: "#006B3C" }}>IT Service Desk</span>
          </h1>

          <button
            className="btn text-white fw-semibold mb-3"
            style={{ backgroundColor: "#006B3C", maxWidth: 200 }}
            onClick={handleCheck}
            disabled={state === "loading"}
          >
            {state === "loading" ? "Loading…" : "Check System"}
          </button>

          {state === "success" && (
            <div className="mt-3 p-3 rounded" style={{ backgroundColor: "#EAF6EF" }}>
              <p className="fs-5 fw-bold mb-2" style={{ color: "#006B3C" }}>
                System Status: Online
              </p>
              <h2 className="h6 fw-bold mb-2" style={{ color: "#1E2923" }}>
                Supported Request Categories
              </h2>
              <ul className="ps-3 mb-0" style={{ color: "#1E2923" }}>
                {categories.map((cat) => (
                  <li key={cat.id}>{cat.name}</li>
                ))}
              </ul>
            </div>
          )}

          {state === "error" && (
            <div className="mt-3 p-3 rounded" style={{ backgroundColor: "#FEE2E2" }}>
              <p className="fs-5 fw-bold mb-1" style={{ color: "#D92D20" }}>
                System Status: Offline
              </p>
              <p className="small mb-0" style={{ color: "#D92D20" }}>
                {errorMsg || "Unable to connect to TokTickIT API"}
              </p>
            </div>
          )}
        </div>
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
