import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { formatDate, formatDateTime } from "../utils/date";
import Icon from "../components/Icon";
import { SkeletonTable } from "../components/Skeleton";

const money = (n) => `Rs ${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtDate = (x) => formatDate(x);

export default function ClientLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc"); // newest first by default
  // Record-payment modal
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
  const [payError, setPayError] = useState("");

  const loadTreatments = () =>
    api.get("/treatments", { params: { client: id } }).then((t) => setTreatments(t.data));

  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([
          api.get(`/clients/${id}`),
          api.get("/treatments", { params: { client: id } }),
        ]);
        setClient(c.data);
        setTreatments(t.data);
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true);
        else console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const openPayment = (t) => {
    setPayTarget(t);
    setPayForm({ amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
    setPayError("");
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setPayError("");
    if (!payForm.amount || Number(payForm.amount) <= 0)
      return setPayError("Enter a valid amount.");
    try {
      await api.post(`/treatments/${payTarget._id}/payments`, {
        amount: Number(payForm.amount),
        note: payForm.note,
        date: payForm.date,
      });
      setPayTarget(null);
      await loadTreatments();
    } catch (err) {
      setPayError(err.response?.data?.message || "Could not record payment.");
    }
  };

  const billed = treatments.reduce((s, t) => s + (t.cost || 0), 0);
  const collected = treatments.reduce((s, t) => s + (t.paidAmount || 0), 0);
  const outstanding = Math.max(0, billed - collected);

  // Sort by date, then by the recorded time (createdAt) so same-day entries order correctly
  const stamp = (t) => {
    const day = new Date(t.date).getTime() || 0;
    const created = new Date(t.createdAt || t.date).getTime() || 0;
    return { day, created };
  };
  const sorted = [...treatments].sort((a, b) => {
    const sa = stamp(a);
    const sb = stamp(b);
    const diff = sa.day - sb.day || sa.created - sb.created;
    return sortOrder === "desc" ? -diff : diff;
  });

  if (loading)
    return (
      <div className="page">
        <h1 className="icon"><Icon name="account_circle" /> Client</h1>
        <SkeletonTable rows={4} cols={3} />
      </div>
    );
  if (notFound || !client)
    return <div className="page"><p className="muted">Client not found.</p></div>;

  return (
    <div className="page">
      <button className="ledger-back btn-secondary icon" onClick={() => navigate("/clients")}>
        <Icon name="arrow_back" size={18} /> Back
      </button>
      <div className="page-head">
        <h1 className="icon"><Icon name="account_circle" /> {client.name}</h1>
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        {client.email}
        {client.phone ? ` · ${client.phone}` : ""}
      </p>

      <div className="summary">
        <div className="summary-item">
          <span className="summary-value">{money(billed)}</span>
          <span className="summary-label">Billed</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">{money(collected)}</span>
          <span className="summary-label">Collected</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">{money(outstanding)}</span>
          <span className="summary-label">Outstanding</span>
        </div>
      </div>

      <div className="row gap" style={{ justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
        <h2 className="icon" style={{ margin: 0 }}><Icon name="medical_services" /> Treatments &amp; payments</h2>
        {treatments.length > 1 && (
          <label className="sort-label">
            <Icon name="sort" size={18} />
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        )}
      </div>
      {treatments.length === 0 ? (
        <p className="muted">No treatments recorded for this client yet.</p>
      ) : (
        sorted.map((t) => (
          <div className="card" key={t._id} style={{ maxWidth: "none" }}>
            <div className="row gap" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <strong>{t.procedure}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {fmtDate(t.date)}
                  {t.toothNumber ? ` · Tooth ${t.toothNumber}` : ""}
                  {t.diagnosis ? ` · ${t.diagnosis}` : ""}
                </div>
              </div>
              <div className="row gap" style={{ flexWrap: "wrap", alignItems: "center" }}>
                <span className="tag">Total {money(t.cost)}</span>
                <span className="tag">Paid {money(t.paidAmount)}</span>
                <span className={t.balance > 0 ? "badge-pending" : "badge"}>
                  {t.balance > 0 ? `Balance ${money(t.balance)}` : "Fully paid"}
                </span>
                {t.balance > 0 && (
                  <button className="btn-secondary icon" onClick={() => openPayment(t)}>
                    <Icon name="payments" size={18} /> Record payment
                  </button>
                )}
              </div>
            </div>

            {t.payments?.length > 0 && (
              <div className="timeline">
                {[...t.payments]
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((p, i) => (
                    <div className="timeline-item" key={i}>
                      <Icon name="payments" size={16} />
                      <span className="muted">{fmtDate(p.date)}</span>
                      <strong>{money(p.amount)}</strong>
                      {p.note && <span className="muted">· {p.note}</span>}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* Record-payment modal */}
      {payTarget && (
        <div className="modal-backdrop" onClick={() => setPayTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitPayment} style={{ display: "contents" }}>
              <h3 className="icon"><Icon name="payments" size={18} /> Record payment</h3>
              <p className="muted" style={{ margin: 0 }}>
                {payTarget.procedure} — balance <strong>{money(payTarget.balance)}</strong>
              </p>
              {payError && <div className="error">{payError}</div>}
              <div className="grid-2">
                <label>
                  Amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 2000"
                    value={payForm.amount}
                    onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={payForm.date}
                    onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Note (optional)
                <input
                  placeholder="e.g. Visit 3 adjustment"
                  value={payForm.note}
                  onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                />
              </label>
              <div className="row gap">
                <button type="submit" className="icon"><Icon name="check" size={18} /> Save payment</button>
                <button type="button" className="btn-secondary" onClick={() => setPayTarget(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
