import { useEffect, useState } from "react";
import api from "../api/axios";

const empty = {
  client: "",
  procedure: "",
  toothNumber: "",
  diagnosis: "",
  description: "",
  cost: 0,
  paid: false,
  date: new Date().toISOString().slice(0, 10),
};

export default function Treatments() {
  const [treatments, setTreatments] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(empty);
  const [filterClient, setFilterClient] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const params = filterClient ? { client: filterClient } : {};
    const [t, c] = await Promise.all([
      api.get("/treatments", { params }),
      api.get("/clients"),
    ]);
    setTreatments(t.data);
    setClients(c.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterClient]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/treatments", { ...form, cost: Number(form.cost) || 0 });
      setForm(empty);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this treatment?")) return;
    await api.delete(`/treatments/${id}`);
    load();
  };

  return (
    <div className="page">
      <h1>Treatments</h1>

      <form className="card" onSubmit={handleSubmit}>
        <h3>Record new treatment</h3>
        {error && <div className="error">{error}</div>}
        <div className="grid-2">
          <label>
            Client
            <select
              name="client"
              required
              value={form.client}
              onChange={handleChange}
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Procedure
            <input
              name="procedure"
              required
              value={form.procedure}
              onChange={handleChange}
              placeholder="e.g. Cavity filling"
            />
          </label>
          <label>
            Tooth #
            <input
              name="toothNumber"
              value={form.toothNumber}
              onChange={handleChange}
            />
          </label>
          <label>
            Diagnosis
            <input
              name="diagnosis"
              value={form.diagnosis}
              onChange={handleChange}
            />
          </label>
          <label>
            Cost
            <input
              type="number"
              min="0"
              step="0.01"
              name="cost"
              value={form.cost}
              onChange={handleChange}
            />
          </label>
          <label>
            Date
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            name="description"
            rows={2}
            value={form.description}
            onChange={handleChange}
          />
        </label>
        <label className="row gap">
          <input
            type="checkbox"
            name="paid"
            checked={form.paid}
            onChange={handleChange}
          />
          Paid
        </label>
        <button type="submit">Save treatment</button>
      </form>

      <div className="row gap">
        <label>
          Filter by client:
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Procedure</th>
            <th>Tooth</th>
            <th>Cost</th>
            <th>Paid</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {treatments.map((t) => (
            <tr key={t._id}>
              <td>{new Date(t.date).toLocaleDateString()}</td>
              <td>{t.client?.name}</td>
              <td>{t.procedure}</td>
              <td>{t.toothNumber || "—"}</td>
              <td>{t.cost}</td>
              <td>{t.paid ? "Yes" : "No"}</td>
              <td>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(t._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {treatments.length === 0 && (
            <tr>
              <td colSpan="7" className="muted">
                No treatments recorded.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
