import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { formatDate, formatDateTime } from "../utils/date";
import Icon from "../components/Icon";
import PasswordInput from "../components/PasswordInput";
import { useNotifications } from "../context/NotificationsContext";

const empty = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  dateOfBirth: "",
  address: "",
  medicalNotes: "",
};

export default function Clients() {
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

  const load = async () => {
    const { data } = await api.get("/clients", { params: { search } });
    setClients(data);
  };
  const loadRequests = async () => {
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
    setForm(empty);
    setEditingId(null);
    setError("");
    setShowForm(false);
  };

  const openCreate = () => {
    setForm(empty);
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.dateOfBirth && form.dateOfBirth > new Date().toISOString().slice(0, 10))
      return setError("Date of birth cannot be in the future.");
    if (!editingId) {
      if (form.password.length < 8)
        return setError("Password must be at least 8 characters.");
      if (form.password !== form.confirmPassword)
        return setError("Passwords do not match.");
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
      phone: c.phone || "",
      dateOfBirth: c.dateOfBirth ? c.dateOfBirth.substring(0, 10) : "",
      address: c.address || "",
      medicalNotes: c.medicalNotes || "",
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this client?")) return;
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
        <h1 className="icon"><Icon name="group" /> Clients</h1>
        {!showForm && (
          <button className="icon" onClick={openCreate}>
            <Icon name="person_add" size={18} /> Add client
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
            <Icon name="check_circle" size={18} /> Account created for {created.client.name}
          </h3>
          <textarea readOnly rows={6} value={created.shareMessage} />
          <div className="row gap" style={{ flexWrap: "wrap" }}>
            <button type="button" className="icon" onClick={copyCreds}>
              <Icon name="content_copy" size={18} /> {copied ? "Copied!" : "Copy credentials"}
            </button>
            <a
              className="btn-secondary icon"
              href={waLink}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none" }}
            >
              <Icon name="chat" size={18} /> Share via WhatsApp
            </a>
            <button type="button" className="btn-link" onClick={() => setCreated(null)}>
              Dismiss
            </button>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Credentials were also emailed to {created.credentials.email}.
          </p>
        </div>
      )}

      <div className="search-row">
        <input
          placeholder="Search by name, email, or phone…"
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
          <h3>{editingId ? "Edit client" : "Add new client"}</h3>
          <button type="button" className="modal-close" aria-label="Close" onClick={resetForm}>
            <Icon name="close" />
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="grid-2">
          <label>
            <span className="lbl">Name <span className="req">*</span></span>
            <input name="name" required value={form.name} onChange={handleChange} />
          </label>
          <label>
            <span className="lbl">Email <span className="req">*</span></span>
            <input
              type="email"
              name="email"
              required
              disabled={!!editingId}
              value={form.email}
              onChange={handleChange}
            />
          </label>
          <label>
            <span className="lbl">Phone <span className="req">*</span></span>
            <input
              name="phone"
              required
              placeholder="e.g. 03001234567"
              value={form.phone}
              onChange={handleChange}
            />
          </label>
          <label>
            Date of birth
            <input
              type="date"
              name="dateOfBirth"
              max={new Date().toISOString().slice(0, 10)}
              value={form.dateOfBirth}
              onChange={handleChange}
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
                value={form.confirmPassword}
                onChange={handleChange}
              />
            </label>
          )}
          <label>
            Address
            <input name="address" value={form.address} onChange={handleChange} />
          </label>
        </div>
        <label>
          Medical notes
          <textarea
            name="medicalNotes"
            rows={3}
            value={form.medicalNotes}
            onChange={handleChange}
          />
        </label>
        <div className="row gap">
          <button type="submit">{editingId ? "Update" : "Add client"}</button>
          <button type="button" className="btn-secondary" onClick={resetForm}>
            Cancel
          </button>
        </div>
        </form>
        </div>
      </div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>DOB</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr
              key={c._id}
              className="row-click"
              onClick={() => navigate(`/clients/${c._id}`)}
            >
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.phone || "—"}</td>
              <td>
                {c.dateOfBirth ? formatDate(c.dateOfBirth) : "—"}
              </td>
              <td className="row gap" style={{ justifyContent: "flex-end" }}>
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
                <button
                  className="btn-danger icon"
                  onClick={(e) => { e.stopPropagation(); handleDelete(c._id); }}
                >
                  <Icon name="delete" size={18} /> Delete
                </button>
              </td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan="5" className="muted">
                No clients yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
