import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { formatDateTime } from "../utils/date";
import { useNotifications } from "../context/NotificationsContext";
import Icon from "../components/Icon";
import SlotPicker from "../components/SlotPicker";

const empty = { client: "", date: "", reason: "", notes: "", status: "scheduled" };
const statusLabel = (s) => (s === "no_show" ? "No-show" : s === "pending" ? "Pending" : s);

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [scheduled, setScheduled] = useState(null); // { shareMessage, whatsappUrl } after creating
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date-asc");
  const [selected, setSelected] = useState(null);
  const { items, refresh: refreshNotifications } = useNotifications();
  const navigate = useNavigate();

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

  // Poll periodically so the dentist and assistant see each other's changes
  // (e.g. a slot booked moments ago) without needing a manual refresh.
  useEffect(() => {
    const id = setInterval(loadAppointments, 25000);
    return () => clearInterval(id);
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
    if (!form.date) return setError("Please pick a time slot.");
    if (new Date(form.date).getTime() < Date.now())
      return setError("Appointment cannot be in the past.");
    try {
      // form.date is already an ISO instant from the slot picker
      const payload = { ...form };
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
      // On a conflict (slot taken or record changed by someone else), pull the
      // latest so the dentist/assistant sees the current state before retrying.
      if (err.response?.status === 409) loadAppointments();
    }
  };

  const handleEdit = (a) => {
    setEditingId(a._id);
    setShowForm(true);
    setForm({
      client: a.client?._id || "",
      date: a.date, // ISO; SlotPicker derives day + slot from it
      reason: a.reason || "",
      notes: a.notes || "",
      status: a.status,
      version: a.__v, // for optimistic-concurrency checks on save
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this appointment?")) return;
    await api.delete(`/appointments/${id}`);
    load();
  };

  const respondToRequest = async (id, action) => {
    try {
      await api.patch(`/appointments/${id}/${action}`);
      await loadAppointments();
      refreshNotifications();
    } catch (err) {
      alert(err.response?.data?.message || "Could not update the request.");
      loadAppointments();
    }
  };

  const pendingRequests = appointments.filter((a) => a.status === "pending");

  // Filter by client name/email, then sort by the chosen key.
  // Pending requests are shown in their own panel, not the main table.
  const visible = appointments
    .filter((a) => a.status !== "pending")
    .filter((a) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        a.client?.name?.toLowerCase().includes(q) ||
        a.client?.email?.toLowerCase().includes(q) ||
        a.client?.phone?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date) - new Date(a.date);
        case "created-desc":
          return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
        case "name":
          return (a.client?.name || "").localeCompare(b.client?.name || "");
        case "status":
          return (a.status || "").localeCompare(b.status || "");
        case "date-asc":
        default:
          return new Date(a.date) - new Date(b.date);
      }
    });

  // Split into upcoming vs past (by appointment time), keeping the chosen sort.
  const now = Date.now();
  const upcoming = visible.filter((a) => new Date(a.date).getTime() >= now);
  const past = visible.filter((a) => new Date(a.date).getTime() < now);

  const renderCard = (a) => (
    <div
      key={a._id}
      className="appt-card"
      style={{ cursor: "pointer" }}
      onClick={() => setSelected(a)}
      title="View details"
    >
      <div className="appt-card-head">
        <span className="appt-when icon">
          <Icon name="schedule" size={18} /> {formatDateTime(a.date)}
        </span>
        <div className="row gap" style={{ flexWrap: "wrap" }}>
          <span className={`st st-${a.status}`}>{statusLabel(a.status)}</span>
          {a.arrivalStatus && a.arrivalStatus !== "none" && (
            <span className={`clinic-badge ${a.arrivalStatus === "arrived" ? "open" : "soon"}`}>
              <Icon name={a.arrivalStatus === "arrived" ? "where_to_vote" : "directions_car"} size={14} />
              {a.arrivalStatus === "arrived" ? "Arrived" : "On the way"}
            </span>
          )}
        </div>
      </div>
      <div className="appt-card-body">
        <span className="icon"><Icon name="person" size={16} /> {a.client?.name}</span>
        {a.client?.phone && (
          <span className="icon"><Icon name="call" size={16} /> {a.client.phone}</span>
        )}
        {a.reason && (
          <span className="icon"><Icon name="medical_services" size={16} /> {a.reason}</span>
        )}
      </div>
      <div className="row gap" style={{ flexWrap: "wrap" }}>
        <button className="btn-secondary icon" onClick={(e) => { e.stopPropagation(); handleEdit(a); }}>
          <Icon name="edit" size={18} /> Edit
        </button>
        <button className="btn-danger-soft icon" onClick={(e) => { e.stopPropagation(); handleDelete(a._id); }}>
          <Icon name="delete" size={18} /> Delete
        </button>
      </div>
    </div>
  );

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

      {pendingRequests.length > 0 && (
        <div className="card" style={{ maxWidth: "none" }}>
          <h3 className="icon">
            <Icon name="pending_actions" size={18} /> Appointment requests ({pendingRequests.length})
          </h3>
          {pendingRequests
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map((a) => (
              <div
                key={a._id}
                className="row gap"
                style={{ justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)" }}
              >
                <div>
                  <strong>{a.client?.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {formatDateTime(a.date)}{a.reason ? ` · ${a.reason}` : ""}
                  </div>
                </div>
                <div className="row gap" style={{ flexWrap: "wrap" }}>
                  <button className="icon" onClick={() => respondToRequest(a._id, "confirm")}>
                    <Icon name="check_circle" size={18} /> Confirm
                  </button>
                  <button className="btn-danger-soft icon" onClick={() => respondToRequest(a._id, "decline")}>
                    <Icon name="cancel" size={18} /> Decline
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

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
              className="btn-whatsapp"
              href={scheduled.whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="chat" size={18} /> Share via WhatsApp
            </a>
            <button
              type="button"
              className="btn-secondary"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
              onClick={() => setScheduled(null)}
            >
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
          <div style={{ gridColumn: "1 / -1" }}>
            <SlotPicker
              value={form.date}
              excludeId={editingId}
              onChange={(iso) => setForm((f) => ({ ...f, date: iso }))}
            />
          </div>
          <label>
            Purpose <span className="muted">(optional)</span>
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
                <option value="no_show">No-show</option>
              </select>
            </label>
          )}
        </div>
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
            placeholder="Search by name, email, or phone…"
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
            <option value="date-asc">Appointment date (ascending)</option>
            <option value="date-desc">Appointment date (descending)</option>
            <option value="created-desc">Latest added</option>
            <option value="name">Client name (A–Z)</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="muted">
          {search.trim() ? "No appointments match your search." : "No appointments scheduled."}
        </p>
      ) : (
        <>
          <h2 className="icon"><Icon name="event_upcoming" /> Upcoming ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <p className="muted">No upcoming appointments.</p>
          ) : (
            <div className="appt-list">{upcoming.map(renderCard)}</div>
          )}

          {past.length > 0 && (
            <>
              <h2 className="icon" style={{ marginTop: 24 }}><Icon name="history" /> Past ({past.length})</h2>
              <div className="appt-list">{past.map(renderCard)}</div>
            </>
          )}
        </>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="icon"><Icon name="event" size={18} /> Appointment details</h3>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setSelected(null)}>
                <Icon name="close" />
              </button>
            </div>
            <div className="detail-list">
              <div className="detail-row">
                <Icon name="schedule" size={18} />
                <span>{formatDateTime(selected.date)}</span>
              </div>
              <div className="detail-row">
                <Icon name="person" size={18} />
                <span>{selected.client?.name || "—"}</span>
              </div>
              {selected.client?.phone && (
                <div className="detail-row">
                  <Icon name="call" size={18} />
                  <span>{selected.client.phone}</span>
                </div>
              )}
              {selected.client?.email && (
                <div className="detail-row">
                  <Icon name="mail" size={18} />
                  <span>{selected.client.email}</span>
                </div>
              )}
              <div className="detail-row">
                <Icon name="medical_services" size={18} />
                <span>{selected.reason || "No purpose given"}</span>
              </div>
              <div className="detail-row">
                <Icon name="info" size={18} />
                <span className={`st st-${selected.status}`}>{statusLabel(selected.status)}</span>
              </div>
            </div>
            <div className="row gap" style={{ flexWrap: "wrap" }}>
              {selected.client?._id && (
                <button className="icon" onClick={() => navigate(`/clients/${selected.client._id}`)}>
                  <Icon name="badge" size={18} /> Patient details
                </button>
              )}
              <button
                className="btn-secondary icon"
                onClick={() => { const a = selected; setSelected(null); handleEdit(a); }}
              >
                <Icon name="edit" size={18} /> Edit
              </button>
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
