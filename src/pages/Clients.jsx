import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { formatDate, formatDateTime } from "../utils/date";
import Icon from "../components/Icon";
import PasswordInput from "../components/PasswordInput";
import { useNotifications } from "../context/NotificationsContext";

// New patients get a default password the dentist can share; they change it later.
const DEFAULT_PASSWORD = "123456789";
const empty = {
  name: "",
  email: "",
  password: DEFAULT_PASSWORD,
  confirmPassword: DEFAULT_PASSWORD,
  phone: "",
  // Managed (child/dependent) patient — contact the guardian instead of the patient
  managed: false,
  dateOfBirth: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
};

// Capitalize the first letter of every word as the user types.
const titleCase = (s) => s.replace(/[0-9]/g, "").replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());

export default function Clients({ mode = "patients" }) {
  const isDependents = mode === "dependents";
  const { items, refresh: refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null); // { client, credentials, shareMessage }
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Reset-password flow
  const [resetTarget, setResetTarget] = useState(null); // the patient being reset
  const [resetPwd, setResetPwd] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState(null); // { shareMessage } after reset
  const [resetCopied, setResetCopied] = useState(false);

  const genTempPassword = () => `Dt${Math.random().toString(36).slice(2, 8)}9`;

  const openReset = (c) => {
    setResetTarget(c);
    setResetPwd(genTempPassword());
    setResetError("");
    setResetResult(null);
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setResetError("");
    if (resetPwd.length < 8) return setResetError("Password must be at least 8 characters.");
    setResetBusy(true);
    try {
      const { data } = await api.post(`/clients/${resetTarget._id}/reset-password`, { password: resetPwd });
      setResetResult({ ...data, name: resetTarget.name });
      setResetCopied(false);
      setResetTarget(null);
    } catch (err) {
      setResetError(err.response?.data?.message || "Could not reset password.");
    } finally {
      setResetBusy(false);
    }
  };

  const copyResetCreds = async () => {
    try {
      await navigator.clipboard.writeText(resetResult.shareMessage);
      setResetCopied(true);
    } catch {
      /* ignore */
    }
  };

  const resetWaLink = resetResult
    ? `https://wa.me/?text=${encodeURIComponent(resetResult.shareMessage)}`
    : "#";

  const load = async () => {
    const { data } = await api.get("/clients", {
      params: { search, managed: isDependents },
    });
    setClients(data);
  };
  const loadRequests = async () => {
    if (isDependents) return; // dependents don't self-request association
    const { data } = await api.get("/associations/requests");
    setRequests(data);
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live search by name / email / phone (debounced)
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Refresh the pending-requests list whenever notifications change (new request arrived)
  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ ...empty, managed: isDependents });
    setEditingId(null);
    setError("");
    setShowForm(false);
  };

  const openCreate = () => {
    setForm({ ...empty, managed: isDependents });
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.managed) {
      if (!form.name.trim()) return setError("Patient name is required.");
      if (!form.guardianName.trim()) return setError("Guardian name is required.");
      if (!/^\d{11}$/.test(form.guardianPhone))
        return setError("Guardian phone must be exactly 11 digits.");
    } else {
      if (!/^\d{11}$/.test(form.phone))
        return setError("Phone number must be exactly 11 digits.");
      if (!editingId) {
        if (form.password.length < 8)
          return setError("Password must be at least 8 characters.");
        if (form.password !== form.confirmPassword)
          return setError("Passwords do not match.");
      }
    }
    try {
      if (editingId) {
        await api.put(`/clients/${editingId}`, form);
        resetForm();
      } else {
        const { data } = await api.post("/clients", form);
        setCreated(data);
        setCopied(false);
        resetForm();
      }
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
  };

  const handleEdit = (c) => {
    setEditingId(c._id);
    setShowForm(true);
    setForm({
      name: c.name || "",
      email: c.email || "",
      password: "",
      confirmPassword: "",
      phone: c.phone || "",
      managed: !!c.managed,
      dateOfBirth: c.dateOfBirth ? c.dateOfBirth.substring(0, 10) : "",
      guardianName: c.guardianName || "",
      guardianPhone: c.guardianPhone || "",
      guardianEmail: c.guardianEmail || "",
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this patient?")) return;
    await api.delete(`/clients/${id}`);
    load();
  };

  const respond = async (id, action) => {
    await api.post(`/associations/${id}/${action}`);
    await loadRequests();
    await load();
    refreshNotifications();
  };

  const copyCreds = async () => {
    try {
      await navigator.clipboard.writeText(created.shareMessage);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  const waLink = created
    ? `https://wa.me/?text=${encodeURIComponent(created.shareMessage)}`
    : "#";

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="icon">
          <Icon name={isDependents ? "escalator_warning" : "group"} />{" "}
          {isDependents ? "Dependents" : "Patients"}
        </h1>
        {!showForm && (
          <button className="icon" onClick={openCreate}>
            <Icon name="person_add" size={18} /> {isDependents ? "Add dependent" : "Add patient"}
          </button>
        )}
      </div>

      {/* Pending association requests */}
      {requests.length > 0 && (
        <div className="card" style={{ maxWidth: "none" }}>
          <h3 className="icon">
            <Icon name="person_add" size={18} /> Association requests ({requests.length})
          </h3>
          {requests.map((r) => (
            <div
              key={r._id}
              className="row gap"
              style={{ justifyContent: "space-between", flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 10 }}
            >
              <div>
                <strong>{r.client?.name}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {r.client?.email}
                  {r.client?.phone ? ` · ${r.client.phone}` : ""}
                </div>
              </div>
              <div className="row gap">
                <button className="icon" onClick={() => respond(r._id, "approve")}>
                  <Icon name="check" size={18} /> Approve
                </button>
                <button className="btn-secondary icon" onClick={() => respond(r._id, "reject")}>
                  <Icon name="close" size={18} /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Credentials sharing panel after creating a client */}
      {created && (
        <div className="card" style={{ maxWidth: "none", borderColor: "var(--primary)" }}>
          <h3 className="icon">
            <Icon name="check_circle" size={18} />{" "}
            {created.managed ? "Patient added" : "Account created"} for {created.client.name}
          </h3>
          <textarea readOnly rows={6} value={created.shareMessage} />
          <div className="row gap" style={{ flexWrap: "wrap" }}>
            <button type="button" className="icon" onClick={copyCreds}>
              <Icon name="content_copy" size={18} /> {copied ? "Copied!" : created.managed ? "Copy message" : "Copy credentials"}
            </button>
            <a
              className="btn-whatsapp"
              href={waLink}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="chat" size={18} /> Share via WhatsApp
            </a>
            <button
              type="button"
              className="btn-secondary"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
              onClick={() => setCreated(null)}
            >
              Dismiss
            </button>
          </div>
          {created.credentials.email && (
            <p className="muted" style={{ margin: 0 }}>
              {created.managed ? "Details were also emailed to " : "Credentials were also emailed to "}
              {created.credentials.email}.
            </p>
          )}
        </div>
      )}

      {resetResult && (
        <div className="card" style={{ maxWidth: "none", borderColor: "var(--primary)" }}>
          <h3 className="icon">
            <Icon name="lock_reset" size={18} /> Password reset for {resetResult.name}
          </h3>
          <textarea readOnly rows={6} value={resetResult.shareMessage} />
          <div className="row gap" style={{ flexWrap: "wrap" }}>
            <button type="button" className="icon" onClick={copyResetCreds}>
              <Icon name="content_copy" size={18} /> {resetCopied ? "Copied!" : "Copy credentials"}
            </button>
            <a className="btn-whatsapp" href={resetWaLink} target="_blank" rel="noreferrer">
              <Icon name="chat" size={18} /> Share via WhatsApp
            </a>
            <button
              type="button"
              className="btn-secondary"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
              onClick={() => setResetResult(null)}
            >
              Dismiss
            </button>
          </div>
          {resetResult.credentials?.email && (
            <p className="muted" style={{ margin: 0 }}>
              The new password was not emailed automatically — share it with the patient.
            </p>
          )}
        </div>
      )}

      {resetTarget && (
        <div className="modal-backdrop" onClick={() => setResetTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitReset} style={{ display: "contents" }}>
              <div className="modal-head">
                <h3 className="icon"><Icon name="lock_reset" size={18} /> Reset password</h3>
                <button type="button" className="modal-close" aria-label="Close" onClick={() => setResetTarget(null)}>
                  <Icon name="close" />
                </button>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Set a new temporary password for <strong>{resetTarget.name}</strong>. Share it with them; they can change it after signing in.
              </p>
              {resetError && <div className="error">{resetError}</div>}
              <label>
                <span className="lbl">New password <span className="req">*</span></span>
                <div className="row gap">
                  <input
                    style={{ flex: 1 }}
                    value={resetPwd}
                    onChange={(e) => setResetPwd(e.target.value)}
                  />
                  <button type="button" className="btn-secondary icon" onClick={() => setResetPwd(genTempPassword())}>
                    <Icon name="autorenew" size={18} /> Generate
                  </button>
                </div>
              </label>
              <div className="row gap">
                <button type="submit" className="icon" disabled={resetBusy}>
                  <Icon name="lock_reset" size={18} /> {resetBusy ? "Resetting…" : "Reset password"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setResetTarget(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="search-row">
        <input
          placeholder={isDependents ? "Search by child or guardian…" : "Search by name, email, or phone…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="icon search-btn" onClick={load} aria-label="Search">
          <Icon name="search" size={18} />
        </button>
      </div>

      {showForm && (
      <div className="modal-backdrop" onClick={resetForm}>
        <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
        <div className="modal-head">
          <h3>
            {editingId
              ? isDependents ? "Edit dependent" : "Edit patient"
              : isDependents ? "Add dependent (child)" : "Add new patient"}
          </h3>
          <button type="button" className="modal-close" aria-label="Close" onClick={resetForm}>
            <Icon name="close" />
          </button>
        </div>
        {error && <div className="error">{error}</div>}

        {form.managed ? (
          <>
            <div className="grid-2">
              <label>
                <span className="lbl">Patient name <span className="req">*</span></span>
                <input
                  required
                  autoCapitalize="words"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: titleCase(e.target.value) })}
                />
              </label>
              <label>
                <span className="lbl">Date of birth</span>
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                />
              </label>
            </div>
            <label>
              <span className="lbl">Guardian name <span className="req">*</span></span>
              <input
                required
                autoCapitalize="words"
                value={form.guardianName}
                onChange={(e) => setForm({ ...form, guardianName: titleCase(e.target.value) })}
              />
            </label>
            <label>
              <span className="lbl">Guardian phone <span className="req">*</span></span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                required
                placeholder="e.g. 03001234567"
                value={form.guardianPhone}
                onChange={(e) =>
                  setForm({ ...form, guardianPhone: e.target.value.replace(/\D/g, "").slice(0, 11) })
                }
              />
            </label>
            <label>
              <span className="lbl">Guardian email <span className="muted">(optional)</span></span>
              <input
                type="email"
                value={form.guardianEmail}
                onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })}
              />
            </label>
          </>
        ) : (
          <>
            <div className="grid-2">
              <label>
                <span className="lbl">Name <span className="req">*</span></span>
                <input
                  name="name"
                  required
                  autoCapitalize="words"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: titleCase(e.target.value) })}
                />
              </label>
              <label>
                <span className="lbl">Email <span className="muted">(optional)</span></span>
                <input
                  type="email"
                  name="email"
                  disabled={!!editingId}
                  value={form.email}
                  onChange={handleChange}
                />
              </label>
            </div>
            <label>
              <span className="lbl">Phone <span className="req">*</span></span>
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                required
                placeholder="e.g. 03001234567"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })
                }
              />
            </label>
            {!editingId && (
              <label>
                <span className="lbl">Password (min 8) <span className="req">*</span></span>
                <PasswordInput
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  defaultVisible
                  value={form.password}
                  onChange={handleChange}
                />
              </label>
            )}
            {!editingId && (
              <label>
                <span className="lbl">Confirm password <span className="req">*</span></span>
                <PasswordInput
                  name="confirmPassword"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  defaultVisible
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
              </label>
            )}
          </>
        )}
        <div className="row gap">
          <button type="submit">{editingId ? "Update" : isDependents ? "Add dependent" : "Add patient"}</button>
          <button type="button" className="btn-secondary" onClick={resetForm}>
            Cancel
          </button>
        </div>
        </form>
        </div>
      </div>
      )}

      {clients.length === 0 ? (
        <p className="muted">{isDependents ? "No dependents yet." : "No patients yet."}</p>
      ) : (
        <div className="appt-list">
          {clients.map((c) => (
            <div
              key={c._id}
              className="appt-card"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/clients/${c._id}`)}
              title="View patient record"
            >
              <div className="appt-card-head">
                <span className="appt-when icon">
                  <Icon name="person" size={18} /> {c.name}
                </span>
                {c.managed && <span className="st st-scheduled">Child</span>}
              </div>
              <div className="appt-card-body">
                {c.managed ? (
                  <>
                    <span className="icon"><Icon name="escalator_warning" size={16} /> Guardian: {c.guardianName || "—"}</span>
                    {c.guardianPhone && <span className="icon"><Icon name="call" size={16} /> {c.guardianPhone}</span>}
                    {c.guardianEmail && <span className="icon"><Icon name="mail" size={16} /> {c.guardianEmail}</span>}
                  </>
                ) : (
                  <>
                    {c.phone && <span className="icon"><Icon name="call" size={16} /> {c.phone}</span>}
                    {c.email && <span className="icon"><Icon name="mail" size={16} /> {c.email}</span>}
                  </>
                )}
                {c.dateOfBirth && (
                  <span className="icon"><Icon name="cake" size={16} /> {formatDate(c.dateOfBirth)}</span>
                )}
              </div>
              <div className="row gap" style={{ flexWrap: "wrap" }}>
                <button
                  className="btn-secondary icon"
                  onClick={(e) => { e.stopPropagation(); navigate(`/clients/${c._id}`); }}
                >
                  <Icon name="history" size={18} /> History
                </button>
                <button
                  className="btn-secondary icon"
                  onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                >
                  <Icon name="edit" size={18} /> Edit
                </button>
                {!c.managed && (
                  <button
                    className="btn-secondary icon"
                    title="Reset password"
                    onClick={(e) => { e.stopPropagation(); openReset(c); }}
                  >
                    <Icon name="lock_reset" size={18} /> Reset
                  </button>
                )}
                <button
                  className="btn-danger-soft icon"
                  onClick={(e) => { e.stopPropagation(); handleDelete(c._id); }}
                >
                  <Icon name="delete" size={18} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
