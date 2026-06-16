import { useEffect, useState } from "react";
import api from "../api/axios";
import Icon from "../components/Icon";
import { SkeletonTable } from "../components/Skeleton";

const CATEGORIES = [
  "Machine maintenance",
  "Equipment repair",
  "Consumables",
  "Sterilization",
  "Utilities",
  "Rent",
  "Staff",
  "Other",
];

const money = (n) =>
  `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

const EMPTY = { title: "", category: "Machine maintenance", amount: "", date: todayISO(), notes: "" };

export default function Maintenance() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get("/expenses");
      setExpenses(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Title is required.");
    if (form.amount === "" || Number(form.amount) < 0)
      return setError("Enter a valid amount.");
    try {
      await api.post("/expenses", { ...form, amount: Number(form.amount) });
      setForm({ ...EMPTY, date: form.date });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save expense.");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this expense?")) return;
    await api.delete(`/expenses/${id}`);
    await load();
  };

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="page">
      <h1 className="icon">
        <Icon name="handyman" /> Maintenance &amp; expenses
      </h1>

      <form className="card" onSubmit={handleSubmit}>
        <h3 className="icon">
          <Icon name="add_box" size={18} /> Record an expense
        </h3>
        {error && <div className="error">{error}</div>}
        <div className="grid-2">
          <label>
            Title
            <input
              name="title"
              placeholder="e.g. Autoclave annual service"
              value={form.title}
              onChange={handleChange}
            />
          </label>
          <label>
            Category
            <select name="category" value={form.category} onChange={handleChange}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              name="amount"
              min="0"
              step="0.01"
              value={form.amount}
              onKeyDown={(e) => {
                if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
              }}
              onChange={handleChange}
            />
          </label>
          <label>
            Date
            <input type="date" name="date" value={form.date} onChange={handleChange} />
          </label>
        </div>
        <label>
          Notes
          <textarea name="notes" rows={2} value={form.notes} onChange={handleChange} />
        </label>
        <button type="submit">Add expense</button>
      </form>

      <div className="row gap" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 className="icon"><Icon name="receipt_long" /> Logged expenses</h2>
        <strong className="money">Total: {money(total)}</strong>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : expenses.length === 0 ? (
        <p className="muted">No maintenance expenses recorded yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Category</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e._id}>
                <td>{new Date(e.date).toLocaleDateString()}</td>
                <td>
                  {e.title}
                  {e.notes && <div className="muted" style={{ fontSize: 13 }}>{e.notes}</div>}
                </td>
                <td><span className="tag">{e.category || "Other"}</span></td>
                <td className="money">{money(e.amount)}</td>
                <td>
                  <button className="btn-link icon" onClick={() => remove(e._id)}>
                    <Icon name="delete" size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
