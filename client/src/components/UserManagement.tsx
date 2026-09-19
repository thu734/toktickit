import React, { useEffect, useState, useCallback } from "react";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
  AdminUser,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from "../api.js";

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState<CreateAdminUserPayload>({
    name: "",
    email: "",
    role: "REQUESTER",
    isActive: true,
    initialPassword: "",
  });
  const [createError, setCreateError] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editData, setEditData] = useState<UpdateAdminUserPayload>({
    name: "",
    email: "",
    role: "REQUESTER",
    isActive: true,
  });
  const [editError, setEditError] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminUsers(appliedSearch || undefined, roleFilter !== "ALL" ? roleFilter : undefined);
      setUsers(data);
    } catch (err: any) {
      if (err?.status === 403) {
        setError("Access Denied: Administrator authorization required.");
      } else {
        setError(err.message || "Unable to load user accounts. Please refresh.");
      }
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setRoleFilter("ALL");
  };

  // Create User Handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateBusy(true);

    try {
      await createAdminUser(createData);
      setShowCreateModal(false);
      setCreateData({
        name: "",
        email: "",
        role: "REQUESTER",
        isActive: true,
        initialPassword: "",
      });
      setSuccessMessage("User account created successfully.");
      loadUsers();
    } catch (err: any) {
      if (err?.status === 409 || err?.code === "EMAIL_ALREADY_EXISTS") {
        setCreateError("A user account with this email address already exists.");
      } else {
        setCreateError(err.message || "Failed to create user account.");
      }
    } finally {
      setCreateBusy(false);
    }
  };

  // Edit User Handler
  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setEditError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditError("");
    setEditBusy(true);

    try {
      await updateAdminUser(editingUser.id, editData);
      setEditingUser(null);
      setSuccessMessage("User account updated successfully.");
      loadUsers();
    } catch (err: any) {
      if (err?.status === 409 || err?.code === "EMAIL_ALREADY_EXISTS") {
        setEditError("A user account with this email address already exists.");
      } else if (err.message && err.message.includes("deactivate your own account")) {
        setEditError("You cannot deactivate your own account.");
      } else if (err.message && err.message.includes("only active Administrator")) {
        setEditError("Cannot deactivate the only active Administrator account.");
      } else {
        setEditError(err.message || "Failed to update user account.");
      }
    } finally {
      setEditBusy(false);
    }
  };

  // Reset Password Handler
  const openResetModal = (user: AdminUser) => {
    setResetUser(user);
    setResetPasswordInput("");
    setResetError("");
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;

    setResetError("");
    setResetBusy(true);

    try {
      await resetAdminUserPassword(resetUser.id, resetPasswordInput);
      setResetUser(null);
      setSuccessMessage("User initial password reset successfully.");
      loadUsers();
    } catch (err: any) {
      setResetError(err.message || "Failed to reset user password.");
    } finally {
      setResetBusy(false);
    }
  };

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return <span className="badge rounded-pill bg-purple text-white px-2 py-1" style={{ backgroundColor: "#6B21A8" }}>Admin</span>;
      case "IT_STAFF":
        return <span className="badge rounded-pill bg-success text-white px-2 py-1" style={{ backgroundColor: "#006B3C" }}>IT Staff</span>;
      default:
        return <span className="badge rounded-pill bg-secondary text-white px-2 py-1">Requester</span>;
    }
  };

  if (error && error.includes("Access Denied")) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger shadow-sm text-center p-4">
          <h4 className="fw-bold">Access Denied</h4>
          <p className="mb-0">Administrator authorization required to view User Management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "1280px" }}>
      {/* Header Toolbar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: "#006B3C" }}>User Management</h2>
          <p className="text-muted small mb-0">View, create, edit user accounts and reset initial passwords.</p>
        </div>
        <button
          type="button"
          className="btn btn-zen-primary shadow-sm"
          onClick={() => {
            setCreateError("");
            setShowCreateModal(true);
          }}
        >
          + Create User
        </button>
      </div>

      {/* Success Callout Banner */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show small shadow-sm mb-4" role="alert">
          ✅ {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage("")}></button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="alert alert-danger small shadow-sm mb-4">
          🚨 {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card p-3 mb-4 surface-card shadow-sm" style={{ borderColor: "#E2E8F0" }}>
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-4">
            <select
              className="form-select form-select-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
          </div>

          <div className="col-12 col-md-3 d-flex gap-2">
            <button type="submit" className="btn btn-sm btn-zen-primary flex-grow-1">
              Search
            </button>
            {(appliedSearch || roleFilter !== "ALL") && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleClearFilters}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* User Table / Cards */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading users...</span>
          </div>
          <div className="text-muted small mt-2">Loading user accounts...</div>
        </div>
      ) : users.length === 0 ? (
        <div className="card p-5 text-center surface-card border-dashed">
          <div className="text-muted mb-2">No user accounts found.</div>
          {(appliedSearch || roleFilter !== "ALL") && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary mx-auto mt-2"
              onClick={handleClearFilters}
              style={{ width: "fit-content" }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table (≥ 992px) */}
          <div className="d-none d-lg-block card surface-card shadow-sm mb-4" style={{ borderColor: "#E2E8F0" }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ backgroundColor: "#F8FAFC" }}>
                  <tr>
                    <th className="small fw-bold text-muted">Name</th>
                    <th className="small fw-bold text-muted">Email</th>
                    <th className="small fw-bold text-muted">Role</th>
                    <th className="small fw-bold text-muted">Status</th>
                    <th className="small fw-bold text-muted text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="fw-bold small text-dark">{u.name}</td>
                      <td className="small text-muted">{u.email}</td>
                      <td>{renderRoleBadge(u.role)}</td>
                      <td>
                        {u.isActive ? (
                          <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle">
                            Active
                          </span>
                        ) : (
                          <span className="badge rounded-pill bg-secondary-subtle text-secondary border">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => openEditModal(u)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => openResetModal(u)}
                          >
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards (< 992px) */}
          <div className="d-lg-none row g-3 mb-4">
            {users.map((u) => (
              <div className="col-12" key={u.id}>
                <div className="card p-3 surface-card shadow-sm" style={{ borderColor: "#E2E8F0" }}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="fw-bold mb-0">{u.name}</h6>
                      <div className="small text-muted">{u.email}</div>
                    </div>
                    <div>{renderRoleBadge(u.role)}</div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                    <div>
                      {u.isActive ? (
                        <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle">Active</span>
                      ) : (
                        <span className="badge rounded-pill bg-secondary-subtle text-secondary border">Inactive</span>
                      )}
                    </div>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => openEditModal(u)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => openResetModal(u)}
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Create New User Account</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  {createError && <div className="alert alert-danger small p-2 mb-3">{createError}</div>}

                  <div className="mb-3">
                    <label htmlFor="createName" className="form-label small fw-bold text-muted">Full Name *</label>
                    <input
                      id="createName"
                      type="text"
                      className="form-control form-control-sm"
                      required
                      value={createData.name}
                      onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="createEmail" className="form-label small fw-bold text-muted">Email Address *</label>
                    <input
                      id="createEmail"
                      type="email"
                      className="form-control form-control-sm"
                      required
                      value={createData.email}
                      onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="createRole" className="form-label small fw-bold text-muted">Role *</label>
                    <select
                      id="createRole"
                      className="form-select form-select-sm"
                      value={createData.role}
                      onChange={(e) => setCreateData({ ...createData, role: e.target.value as any })}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="createPassword" className="form-label small fw-bold text-muted">Initial Password *</label>
                    <input
                      id="createPassword"
                      type="password"
                      className="form-control form-control-sm"
                      required
                      placeholder="Min 8 chars, uppercase, lowercase, digit, symbol"
                      value={createData.initialPassword}
                      onChange={(e) => setCreateData({ ...createData, initialPassword: e.target.value })}
                    />
                  </div>

                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="createActiveSwitch"
                      checked={createData.isActive}
                      onChange={(e) => setCreateData({ ...createData, isActive: e.target.checked })}
                    />
                    <label className="form-check-label small fw-bold" htmlFor="createActiveSwitch">
                      Account Active Status
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-zen-primary btn-sm" disabled={createBusy}>
                    {createBusy ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Edit User Account</h5>
                <button type="button" className="btn-close" onClick={() => setEditingUser(null)}></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  {editError && <div className="alert alert-danger small p-2 mb-3">{editError}</div>}

                  <div className="mb-3">
                    <label htmlFor="editName" className="form-label small fw-bold text-muted">Full Name *</label>
                    <input
                      id="editName"
                      type="text"
                      className="form-control form-control-sm"
                      required
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="editEmail" className="form-label small fw-bold text-muted">Email Address *</label>
                    <input
                      id="editEmail"
                      type="email"
                      className="form-control form-control-sm"
                      required
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="editRole" className="form-label small fw-bold text-muted">Role *</label>
                    <select
                      id="editRole"
                      className="form-select form-select-sm"
                      value={editData.role}
                      onChange={(e) => setEditData({ ...editData, role: e.target.value as any })}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="editActiveSwitch"
                      checked={editData.isActive}
                      onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                    />
                    <label className="form-check-label small fw-bold" htmlFor="editActiveSwitch">
                      Account Active Status
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingUser(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-zen-primary btn-sm" disabled={editBusy}>
                    {editBusy ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Reset Initial Password</h5>
                <button type="button" className="btn-close" onClick={() => setResetUser(null)}></button>
              </div>
              <form onSubmit={handleResetSubmit}>
                <div className="modal-body">
                  <div className="alert alert-info small p-2 mb-3">
                    Assign a new initial password for <strong>{resetUser.name}</strong>. The user will be required to change it upon next login.
                  </div>

                  {resetError && <div className="alert alert-danger small p-2 mb-3">{resetError}</div>}

                  <div className="mb-3">
                    <label htmlFor="resetPassword" className="form-label small fw-bold text-muted">New Initial Password *</label>
                    <input
                      id="resetPassword"
                      type="password"
                      className="form-control form-control-sm"
                      required
                      placeholder="Min 8 chars, uppercase, lowercase, digit, symbol"
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResetUser(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-zen-primary btn-sm" disabled={resetBusy}>
                    {resetBusy ? "Resetting..." : "Set Initial Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
