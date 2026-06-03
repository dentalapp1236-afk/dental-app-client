import { useEffect, useState } from "react";
import api from "../api/axios";

const empty = {
  name: "",
  email: "",
  password: "",
  phone: "",
  dateOfBirth: "",
  address: "",
  medicalNotes: "",
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    const { data } = await api.get("/clients", { params: { search } });
    setClients(data);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api.put(`/clients/${editingId}`, form);
      } else {
        await api.post("/clients", form);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
  };

  const handleEdit = (c) => {
    setEditingId(c._id);
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

  return (
    <div className="page">
      <h1>Clients</h1>

      <div className="row gap">
        <input
          placeholder="Search by name, email, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={load}>Search</button>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <h3>{editingId ? "Edit client" : "Add new client"}</h3>
        {error && <div className="error">{error}</div>}
        <div className="grid-2">
          <label>
            Name
            <input name="name" required value={form.name} onChange={handleChange} />
          </label>
          <label>
            Email
            <input
              type="email"
              name="email"
              required
              disabled={!!editingId}
              value={form.email}
              onChange={handleChange}
            />
          </label>
          {!editingId && (
            <label>
              Password (min 8)
              <input
                type="password"
                name="password"
                required
                minLength={8}
                value={form.password}
                onChange={handleChange}
              />
            </label>
          )}
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={handleChange} />
          </label>
          <label>
            Date of birth
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
            />
          </label>
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
          {editingId && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

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
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.phone || "—"}</td>
              <td>
                {c.dateOfBirth
                  ? new Date(c.dateOfBirth).toLocaleDateString()
                  : "—"}
              </td>
              <td className="row gap">
                <button onClick={() => handleEdit(c)}>Edit</button>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(c._id)}
                >
                  Delete
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
