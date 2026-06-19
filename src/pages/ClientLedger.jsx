import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { formatDate, formatDateTime } from "../utils/date";
import Icon from "../components/Icon";
import { SkeletonTable } from "../components/Skeleton";

const money = (n) => `Rs ${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtDate = (x) => formatDate(x);
// Earliest selectable value for <input type="datetime-local"> = now, in local time.
const nowLocalInput = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

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
  // Edit-payment modal
  const [editPay, setEditPay] = useState(null); // { treatId, paymentId, amount, note, date }
  const [editPayError, setEditPayError] = useState("");
  // Record-treatment modal
  const TREAT_EMPTY = {
    procedure: "",
    toothNumber: "",
    diagnosis: "",
    description: "",
    cost: "",
    upfront: "",
    date: new Date().toISOString().slice(0, 10),
  };
  const [showTreat, setShowTreat] = useState(false);
  const [treatForm, setTreatForm] = useState(TREAT_EMPTY);
  const [treatError, setTreatError] = useState("");
  const [editingTreatId, setEditingTreatId] = useState(null);
  // Schedule-appointment modal
  const [showAppt, setShowAppt] = useState(false);
  const [apptForm, setApptForm] = useState({ reason: "", date: "", notes: "" });
  const [apptError, setApptError] = useState("");
  const [apptShare, setApptShare] = useState(null); // { whatsappUrl } after scheduling

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

  const openTreat = () => {
    setEditingTreatId(null);
    setTreatForm(TREAT_EMPTY);
    setTreatError("");
    setShowTreat(true);
  };

  const openEditTreat = (t) => {
    setEditingTreatId(t._id);
    setTreatForm({
      procedure: t.procedure || "",
      toothNumber: t.toothNumber || "",
      diagnosis: t.diagnosis || "",
      description: t.description || "",
      cost: t.cost ?? "",
      upfront: "",
      date: t.date ? new Date(t.date).toISOString().slice(0, 10) : TREAT_EMPTY.date,
    });
    setTreatError("");
    setShowTreat(true);
  };

  const treatChange = (e) => setTreatForm({ ...treatForm, [e.target.name]: e.target.value });

  const openAppt = () => {
    setApptForm({ reason: "", date: "", notes: "" });
    setApptError("");
    setShowAppt(true);
  };

  const submitAppt = async (e) => {
    e.preventDefault();
    setApptError("");
    if (!apptForm.date) return setApptError("Pick a date and time.");
    if (new Date(apptForm.date).getTime() < Date.now())
      return setApptError("Appointment cannot be in the past.");
    try {
      const { data } = await api.post("/appointments", {
        client: id,
        reason: apptForm.reason,
        notes: apptForm.notes,
        date: new Date(apptForm.date).toISOString(),
      });
      setShowAppt(false);
      setApptShare(data);
    } catch (err) {
      setApptError(err.response?.data?.message || "Could not schedule appointment.");
    }
  };

  const submitTreat = async (e) => {
    e.preventDefault();
    setTreatError("");
    if (!treatForm.procedure.trim()) return setTreatError("Procedure is required.");
    try {
      if (editingTreatId) {
        await api.put(`/treatments/${editingTreatId}`, {
          procedure: treatForm.procedure,
          toothNumber: treatForm.toothNumber,
          diagnosis: treatForm.diagnosis,
          description: treatForm.description,
          cost: Number(treatForm.cost) || 0,
          date: treatForm.date,
        });
      } else {
        await api.post("/treatments", {
          client: id,
          procedure: treatForm.procedure,
          toothNumber: treatForm.toothNumber,
          diagnosis: treatForm.diagnosis,
          description: treatForm.description,
          cost: Number(treatForm.cost) || 0,
          upfront: Number(treatForm.upfront) || 0,
          date: treatForm.date,
        });
      }
      setShowTreat(false);
      await loadTreatments();
    } catch (err) {
      setTreatError(err.response?.data?.message || "Could not save treatment.");
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setPayError("");
    if (!payForm.amount || Number(payForm.amount) <= 0)
      return setPayError("Enter a valid amount.");
    if (Number(payForm.amount) > payTarget.balance)
      return setPayError(`Amount cannot exceed the remaining balance (${money(payTarget.balance)}).`);
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

  const deleteTreat = async (t) => {
    if (!confirm(`Delete the "${t.procedure}" treatment and all its payments?`)) return;
    try {
      await api.delete(`/treatments/${t._id}`);
      await loadTreatments();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete treatment.");
    }
  };

  const openEditPayment = (treatId, p) => {
    setEditPay({
      treatId,
      paymentId: p._id,
      amount: p.amount ?? "",
      note: p.note || "",
      date: p.date ? new Date(p.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    setEditPayError("");
  };

  const submitEditPayment = async (e) => {
    e.preventDefault();
    setEditPayError("");
    if (!editPay.amount || Number(editPay.amount) <= 0)
      return setEditPayError("Enter a valid amount.");
    const tr = treatments.find((t) => t._id === editPay.treatId);
    if (tr && tr.cost > 0) {
      const others = (tr.paidAmount || 0) - (tr.payments.find((p) => p._id === editPay.paymentId)?.amount || 0);
      const maxAllowed = tr.cost - others;
      if (Number(editPay.amount) > maxAllowed)
        return setEditPayError(`Amount cannot exceed the remaining balance (${money(maxAllowed)}).`);
    }
    try {
      await api.put(`/treatments/${editPay.treatId}/payments/${editPay.paymentId}`, {
        amount: Number(editPay.amount),
        note: editPay.note,
        date: editPay.date,
      });
      setEditPay(null);
      await loadTreatments();
    } catch (err) {
      setEditPayError(err.response?.data?.message || "Could not update payment.");
    }
  };

  const deletePayment = async (treatId, paymentId) => {
    if (!confirm("Delete this payment?")) return;
    try {
      await api.delete(`/treatments/${treatId}/payments/${paymentId}`);
      await loadTreatments();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete payment.");
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
        <button className="icon" onClick={openAppt}>
          <Icon name="event" size={18} /> Schedule appointment
        </button>
      </div>

      {apptShare && (
        <div className="card" style={{ maxWidth: "none", borderColor: "var(--primary)" }}>
          <h3 className="icon"><Icon name="event_available" size={18} /> Appointment scheduled</h3>
          <p className="muted" style={{ margin: 0 }}>
            {client.name} has been notified in-app and by email. You can also send a WhatsApp reminder:
          </p>
          <div className="row gap" style={{ flexWrap: "wrap" }}>
            <a
              className="btn-whatsapp"
              href={apptShare.whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="chat" size={18} /> Share via WhatsApp
            </a>
            <button type="button" className="btn-link" onClick={() => setApptShare(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}
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
        <div className="row gap" style={{ flexWrap: "wrap" }}>
          {treatments.length > 1 && (
            <label className="sort-label">
              <Icon name="sort" size={18} />
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
          )}
          <button className="icon" onClick={openTreat}>
            <Icon name="add_circle" size={18} /> Record treatment
          </button>
        </div>
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
                {t.cost > 0 ? (
                  <>
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
                  </>
                ) : (
                  <span className="badge">No charge</span>
                )}
                <button className="btn-secondary icon" onClick={() => openEditTreat(t)}>
                  <Icon name="edit" size={18} /> Edit
                </button>
                <button className="btn-danger-soft icon" onClick={() => deleteTreat(t)}>
                  <Icon name="delete" size={18} /> Delete
                </button>
              </div>
            </div>

            {t.payments?.length > 0 && (
              <div className="timeline">
                {[...t.payments]
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((p, i) => (
                    <div className="timeline-item" key={p._id || i}>
                      <Icon name="payments" size={16} />
                      <span className="muted">{fmtDate(p.date)}</span>
                      <strong>{money(p.amount)}</strong>
                      {p.note && <span className="muted">· {p.note}</span>}
                      {p._id && (
                        <span className="timeline-actions">
                          <button
                            type="button"
                            className="timeline-action"
                            title="Edit payment"
                            aria-label="Edit payment"
                            onClick={() => openEditPayment(t._id, p)}
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            className="timeline-action danger"
                            title="Delete payment"
                            aria-label="Delete payment"
                            onClick={() => deletePayment(t._id, p._id)}
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* Schedule-appointment modal */}
      {showAppt && (
        <div className="modal-backdrop" onClick={() => setShowAppt(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitAppt} style={{ display: "contents" }}>
              <div className="modal-head">
                <h3 className="icon"><Icon name="event" size={18} /> Schedule appointment for {client.name}</h3>
                <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowAppt(false)}>
                  <Icon name="close" />
                </button>
              </div>
              {apptError && <div className="error">{apptError}</div>}
              <label>
                <span className="lbl">Reason <span className="muted">(optional)</span></span>
                <input
                  placeholder="e.g. Checkup, Braces adjustment"
                  value={apptForm.reason}
                  onChange={(e) => setApptForm({ ...apptForm, reason: e.target.value })}
                />
              </label>
              <label>
                <span className="lbl">Date &amp; time <span className="req">*</span></span>
                <input
                  type="datetime-local"
                  min={nowLocalInput()}
                  value={apptForm.date}
                  onChange={(e) => setApptForm({ ...apptForm, date: e.target.value })}
                />
              </label>
              <label>
                Notes
                <textarea
                  rows={2}
                  value={apptForm.notes}
                  onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })}
                />
              </label>
              <div className="row gap">
                <button type="submit" className="icon"><Icon name="event" size={18} /> Schedule</button>
                <button type="button" className="btn-secondary" onClick={() => setShowAppt(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record-treatment modal */}
      {showTreat && (
        <div className="modal-backdrop" onClick={() => setShowTreat(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitTreat} style={{ display: "contents" }}>
              <div className="modal-head">
                <h3 className="icon">
                  <Icon name={editingTreatId ? "edit" : "add_circle"} size={18} />
                  {editingTreatId ? "Edit treatment" : `Record treatment for ${client.name}`}
                </h3>
                <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowTreat(false)}>
                  <Icon name="close" />
                </button>
              </div>
              {treatError && <div className="error">{treatError}</div>}
              <div className="grid-2">
                <label>
                  <span className="lbl">Procedure <span className="req">*</span></span>
                  <input
                    name="procedure"
                    required
                    placeholder="e.g. Braces"
                    value={treatForm.procedure}
                    onChange={treatChange}
                  />
                </label>
                <label>
                  Tooth #
                  <input name="toothNumber" value={treatForm.toothNumber} onChange={treatChange} />
                </label>
                <label>
                  Total amount <span className="muted">(0 = free / no charge)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="cost"
                    placeholder="e.g. 50000"
                    value={treatForm.cost}
                    onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                    onChange={treatChange}
                  />
                </label>
                {!editingTreatId && (
                  <label>
                    Upfront payment (optional)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="upfront"
                      placeholder="e.g. 25000"
                      value={treatForm.upfront}
                      onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                      onChange={treatChange}
                    />
                  </label>
                )}
                <label>
                  Diagnosis
                  <input name="diagnosis" value={treatForm.diagnosis} onChange={treatChange} />
                </label>
                <label>
                  Date
                  <input type="date" name="date" value={treatForm.date} onChange={treatChange} />
                </label>
              </div>
              <label>
                Description
                <textarea name="description" rows={2} value={treatForm.description} onChange={treatChange} />
              </label>
              <div className="row gap">
                <button type="submit" className="icon">
                  <Icon name="save" size={18} /> {editingTreatId ? "Save changes" : "Save treatment"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowTreat(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
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
                    max={payTarget.balance}
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

      {/* Edit-payment modal */}
      {editPay && (
        <div className="modal-backdrop" onClick={() => setEditPay(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitEditPayment} style={{ display: "contents" }}>
              <div className="modal-head">
                <h3 className="icon"><Icon name="edit" size={18} /> Edit payment</h3>
                <button type="button" className="modal-close" aria-label="Close" onClick={() => setEditPay(null)}>
                  <Icon name="close" />
                </button>
              </div>
              {editPayError && <div className="error">{editPayError}</div>}
              <div className="grid-2">
                <label>
                  Amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPay.amount}
                    onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                    onChange={(e) => setEditPay({ ...editPay, amount: e.target.value })}
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={editPay.date}
                    onChange={(e) => setEditPay({ ...editPay, date: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Note (optional)
                <input
                  value={editPay.note}
                  onChange={(e) => setEditPay({ ...editPay, note: e.target.value })}
                />
              </label>
              <div className="row gap">
                <button type="submit" className="icon"><Icon name="save" size={18} /> Save changes</button>
                <button type="button" className="btn-secondary" onClick={() => setEditPay(null)}>
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
