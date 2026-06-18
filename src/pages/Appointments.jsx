import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatDate, formatDateTime } from "../utils/date";
import Icon from "../components/Icon";

const empty = { client: "", date: "", reason: "", notes: "", status: "scheduled" };

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [a, c] = await Promise.all([
      api.get("/appointments"),
      api.get("/clients"),
    ]);
    setAppointments(a.data);
    setClients(c.data);
  };

  useEffect(() => {
    load();
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
    try {
      if (editingId) {
        await api.put(`/appointments/${editingId}`, form);
      } else {
        await api.post("/appointments", form);
      }
      resetForm();
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
      date: a.date ? new Date(a.date).toISOString().slice(0, 16) : "",
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
              value={form.date}
              onChange={handleChange}
            />
          </label>
          <label>
            Reason
            <input
              name="reason"
              required
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
          {appointments.map((a) => (
            <tr key={a._id}>
              <td>{formatDateTime(a.date)}</td>
              <td>{a.client?.name}</td>
              <td>{a.reason}</td>
              <td>{a.status}</td>
              <td className="row gap" style={{ justifyContent: "flex-end" }}>
                <button className="btn-secondary icon" onClick={() => handleEdit(a)}>
                  <Icon name="edit" size={18} /> Edit
                </button>
                <button
                  className="btn-danger icon"
                  onClick={() => handleDelete(a._id)}
                >
                  <Icon name="delete" size={18} /> Delete
                </button>
              </td>
            </tr>
          ))}
          {appointments.length === 0 && (
            <tr>
              <td colSpan="5" className="muted">
                No appointments scheduled.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
