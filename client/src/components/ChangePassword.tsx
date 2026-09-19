import React, { useState } from "react";
import { changePassword } from "../api";

interface ChangePasswordProps {
  onSuccess?: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic password complexity rules evaluation
  const rules = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "At least 1 uppercase letter (A-Z)", met: /[A-Z]/.test(newPassword) },
    { label: "At least 1 lowercase letter (a-z)", met: /[a-z]/.test(newPassword) },
    { label: "At least 1 numeric digit (0-9)", met: /[0-9]/.test(newPassword) },
    { label: "At least 1 special character (!@#$%^&*)", met: /[!@#$%^&*]/.test(newPassword) },
    {
      label: "Confirm password matches new password",
      met: newPassword.length > 0 && confirmPassword === newPassword,
    },
  ];

  const allRulesMet = rules.every((r) => r.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!allRulesMet) {
      setError("Please satisfy all password complexity requirements before saving.");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccessMsg(res.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
      <div className="card shadow-sm border-0 w-100" style={{ maxWidth: "520px" }}>
        <div className="card-header text-white p-4" style={{ backgroundColor: "#006B3C" }}>
          <h4 className="card-title mb-1 fw-bold">Mandatory Password Change</h4>
          <p className="card-subtitle small opacity-75 mb-0">
            You must change your initial password before continuing to TokTickIT.
          </p>
        </div>

        <div className="card-body p-4">
          {error && (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <span className="me-2">⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success d-flex align-items-center" role="alert">
              <span className="me-2">✅</span>
              <div>{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="currentPassword" className="form-label fw-semibold">
                Current Password <span className="text-danger">*</span>
              </label>
              <input
                id="currentPassword"
                type="password"
                className="form-control"
                placeholder="Enter current / temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label fw-semibold">
                New Password <span className="text-danger">*</span>
              </label>
              <input
                id="newPassword"
                type="password"
                className="form-control"
                placeholder="Enter new secure password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label fw-semibold">
                Confirm New Password <span className="text-danger">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-control"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="card bg-light border-0 p-3 mb-4">
              <h6 className="fw-semibold mb-2 fs-7 text-secondary">Password Requirements Checklist:</h6>
              <ul className="list-unstyled mb-0 small">
                {rules.map((rule, idx) => (
                  <li key={idx} className="d-flex align-items-center mb-1">
                    <span className={`me-2 fw-bold ${rule.met ? "text-success" : "text-muted"}`}>
                      {rule.met ? "✓" : "○"}
                    </span>
                    <span className={rule.met ? "text-dark fw-medium" : "text-muted"}>{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-semibold"
              style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
              disabled={loading || !allRulesMet}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving password...
                </>
              ) : (
                "Save New Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
