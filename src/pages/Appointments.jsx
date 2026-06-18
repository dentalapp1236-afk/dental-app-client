import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatDate, formatDateTime } from "../utils/date";
import { useNotifications } from "../context/NotificationsContext";
import Icon from "../components/Icon";

const empty = { client: "", date: "", reason: "", notes: "", status: "scheduled" };

// Date -> value for <input type="datetime-local"> in LOCAL time
const toLocalInput = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [scheduled, setScheduled] = useState(null); // { shareMessage, whatsappUrl } after creating
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const { items } = useNotifications();

  const load = async () => {
    const [a, c] = await Promise.all([
      api.get("/appointments"),
      api.get("/clients"),
    ]);
    setAppointments(a.data);
    setClients(c.data);
  };
  const loadAppointments = () =>
    api.get("/appointments").then((r) => setAppointments(r.data)).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  // Reflect reschedules made by clients: refetch when a notification arrives or the tab regains focus
  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => {
    const onFocus = () => loadAppointments();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

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
    if (form.date && new Date(form.date).getTime() < Date.now())
      return setError("Appointment cannot be in the past.");
    try {
      // Send the picked local time as a precise ISO instant
      const payload = { ...form, date: form.date ? new Date(form.date).toISOString() : form.date };
      if (editingId) {
        await api.put(`/appointments/${editingId}`, payload);
        resetForm();
      } else {
        const { data } = await api.post("/appointments", payload);
        resetForm();
        setScheduled(data);
      }
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
  };

  const handleEdit = (a) => {
    setEditingId(a._id);
    setShowForm(true);
    setForm({
      client: a.client?._id || "",
      date: toLocalInput(a.date),
      reason: a.reason || "",
      notes: a.notes || "",
      status: a.status,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this appointment?")) return;
    await api.delete(`/appointments/${id}`);
    load();
  };

  // Filter by client name/email, then sort by the chosen key.
  const visible = appointments
    .filter((a) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        a.client?.name?.toLowerCase().includes(q) ||
        a.client?.email?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.date) - new Date(b.date);
        case "name":
          return (a.client?.name || "").localeCompare(b.client?.name || "");
        case "status":
          return (a.status || "").localeCompare(b.status || "");
        case "date-desc":
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="icon"><Icon name="calendar_month" /> Appointments</h1>
        {!showForm && (
          <button className="icon" onClick={openCreate}>
            <Icon name="event" size={18} /> Schedule appointment
          </button>
        )}
      </div>

      {scheduled && (
        <div className="card" style={{ maxWidth: "none", borderColor: "var(--primary)" }}>
          <h3 className="icon">
            <Icon name="event_available" size={18} /> Appointment scheduled
          </h3>
          <p className="muted" style={{ margin: 0 }}>
            The client has been notified in-app and by email. You can also send a WhatsApp reminder:
          </p>
          <div className="row gap" style={{ flexWrap: "wrap" }}>
            <a
              className="btn-secondary icon"
              href={scheduled.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none" }}
            >
              <Icon name="chat" size={18} /> Share via WhatsApp
            </a>
            <button type="button" className="btn-link" onClick={() => setScheduled(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showForm && (
      <div className="modal-backdrop" onClick={resetForm}>
        <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
        <h3 className="icon">
          <Icon name={editingId ? "edit_calendar" : "event"} size={18} />
          {editingId ? "Edit appointment" : "Schedule appointment"}
        </h3>
        {error && <div className="error">{error}</div>}
        <div className="grid-2">
          <label>
            Client
            <select
              name="client"
              required
              value={form.client}
              onChange={handleChange}
              disabled={!!editingId}
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </label>
          <label>
            Date & time
            <input
              type="datetime-local"
              name="date"
              required
              min={toLocalInput(new Date())}
              value={form.date}
              onChange={handleChange}
            />
          </label>
          <label>
            Reason <span className="muted">(optional)</span>
            <input
              name="reason"
              value={form.reason}
              onChange={handleChange}
            />
          </label>
          {editingId && (
            <label>
              Status
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          )}
        </div>
        <label>
          Notes
          <textarea
            name="notes"
            rows={2}
            value={form.notes}
            onChange={handleChange}
          />
        </label>
        <div className="row gap">
          <button type="submit" className="icon">
            <Icon name={editingId ? "save" : "add"} size={18} />
            {editingId ? "Update" : "Create"}
          </button>
          <button type="button" className="btn-secondary" onClick={resetForm}>
            Cancel
          </button>
        </div>
        </form>
        </div>
      </div>
      )}

      <div className="row gap" style={{ flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div className="search-row" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
          <input
            placeholder="Search by client name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-btn icon" aria-hidden="true">
            <Icon name="search" size={18} />
          </span>
        </div>
        <label className="sort-label">
          <Icon name="sort" size={18} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date-desc">Date (newest first)</option>
            <option value="date-asc">Date (oldest first)</option>
            <option value="name">Client name (A–Z)</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Reason</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((a) => (
            <tr key={a._id}>
              <td>{formatDateTime(a.date)}</td>
              <td>{a.client?.name}</td>
              <td>{a.reason || "—"}</td>
              <td>{a.status}</td>
              <td className="row gap" style={{ justifyContent: "flex-end" }}>
                <button className="btn-secondary icon" onClick={() => handleEdit(a)}>
                  <Icon name="edit" size={18} /> Edit
                </button>
                <button
                  className="btn-danger-soft icon"
                  onClick={() => handleDelete(a._id)}
                >
                  <Icon name="delete" size={18} /> Delete
                </button>
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan="5" className="muted">
                {search.trim()
                  ? "No appointments match your search."
                  : "No appointments scheduled."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
