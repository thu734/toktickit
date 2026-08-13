import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  void categories;

  async function handleCheck() {
    // TODO(Issue 4): set loading, call checkSystem(), then either
    //   - success: store categories and show Online + the list, or
    //   - error: show Offline + a useful message.
    setState("loading");
    setErrorMsg("");
    try {
      await checkSystem();
      setState("success");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Unable to connect to TokTickIT API");
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {/* TODO(Issue 4): render loading / success (Online + categories) / error (Offline) states. */}
      {state === "success" && (
        <div className="mt-4">
          <p className="fs-5 fw-bold text-success mb-0">
            System Status: Online
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="mt-4">
          <p className="fs-5 fw-bold text-danger mb-1">
            System Status: Offline
          </p>
          <p className="text-secondary mb-0">
            {errorMsg || "Unable to connect to TokTickIT API"}
          </p>
        </div>
      )}
    </div>
  );
}
