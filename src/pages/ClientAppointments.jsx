import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatDateTime } from "../utils/date";
import Icon from "../components/Icon";
import SlotPicker from "../components/SlotPicker";
import { SkeletonCards } from "../components/Skeleton";

const statusLabel = (s) =>
  s === "pending" ? "Awaiting confirmation" : s === "no_show" ? "No-show" : s;

export default function ClientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [assoc, setAssoc] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reschedule
  const [reschedTarget, setReschedTarget] = useState(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedError, setReschedError] = useState("");
  const [reschedBusy, setReschedBusy] = useState(false);

  // Request a new appointment
  const [showRequest, setShowRequest] = useState(false);
  const [reqDate, setReqDate] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqError, setReqError] = useState("");
  const [reqBusy, setReqBusy] = useState(false);
  const [reqSent, setReqSent] = useState(false);

  const loadAppointments = () =>
    api.get("/appointments", { skipLoader: true }).then((r) => setAppointments(r.data)).catch(() => {});

  useEffect(() => {
    (async () => {
      try {
        const [a, c] = await Promise.all([
          api.get("/appointments"),
          api.get("/associations/me"),
        ]);
        setAppointments(a.data);
        setAssoc(c.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openRequest = () => {
    setReqDate("");
    setReqReason("");
    setReqError("");
    setReqSent(false);
    setShowRequest(true);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    setReqError("");
    if (!reqDate) return setReqError("Please pick a time slot.");
    setReqBusy(true);
    try {
      await api.post("/appointments/request", { date: reqDate, reason: reqReason });
      setShowRequest(false);
      setReqSent(true);
      await loadAppointments();
    } catch (err) {
      setReqError(err.response?.data?.message || "Could not send request.");
    } finally {
      setReqBusy(false);
    }
  };

  const openReschedule = (a) => {
    setReschedTarget(a);
    setReschedDate(a.date);
    setReschedError("");
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    if (!reschedDate) return setReschedError("Pick a new date and time.");
    if (new Date(reschedDate).getTime() < Date.now())
      return setReschedError("Appointment cannot be in the past.");
    setReschedBusy(true);
    try {
      await api.patch(`/appointments/${reschedTarget._id}/reschedule`, { date: reschedDate });
      setReschedTarget(null);
      await loadAppointments();
    } catch (err) {
      setReschedError(err.response?.data?.message || "Could not reschedule.");
    } finally {
      setReschedBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="icon"><Icon name="calendar_month" /> My appointments</h1>
        {assoc?.dentist && (
          <button className="icon" onClick={openRequest}>
            <Icon name="event" size={18} /> Request appointment
          </button>
        )}
      </div>

      {reqSent && (
        <div className="card" style={{ maxWidth: "none", borderColor: "var(--primary)" }}>
          <p className="icon" style={{ margin: 0 }}>
            <Icon name="schedule_send" size={18} /> Request sent — you'll be notified once your dentist confirms.
          </p>
        </div>
      )}

      {loading ? (
        <SkeletonCards count={4} />
      ) : appointments.length === 0 ? (
        <p className="muted">No appointments yet.</p>
      ) : (
        <div className="appt-list">
          {[...appointments]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((a) => {
              const canReschedule = a.status === "scheduled" && new Date(a.date) > new Date();
              return (
                <div key={a._id} className="appt-card">
                  <div className="appt-card-head">
                    <span className="appt-when icon">
                      <Icon name="schedule" size={18} /> {formatDateTime(a.date)}
                    </span>
                    <span className={`st st-${a.status}`}>{statusLabel(a.status)}</span>
                  </div>
                  <div className="appt-card-body">
                    <span className="icon"><Icon name="person" size={16} /> Dr. {a.dentist?.name}</span>
                    {a.reason && (
                      <span className="icon"><Icon name="medical_services" size={16} /> {a.reason}</span>
                    )}
                  </div>
                  {canReschedule && (
                    <div className="row">
                      <button className="btn-secondary icon" onClick={() => openReschedule(a)}>
                        <Icon name="edit_calendar" size={18} /> Reschedule
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {reschedTarget && (
        <div className="modal-backdrop" onClick={() => setReschedTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitReschedule} style={{ display: "contents" }}>
              <h3 className="icon"><Icon name="edit_calendar" size={18} /> Reschedule appointment</h3>
              <p className="muted" style={{ margin: 0 }}>
                {reschedTarget.reason} with Dr. {reschedTarget.dentist?.name} — currently{" "}
                {formatDateTime(reschedTarget.date)}
              </p>
              {reschedError && <div className="error">{reschedError}</div>}
              <SlotPicker
                value={reschedDate}
                excludeId={reschedTarget._id}
                onChange={(iso) => setReschedDate(iso)}
              />
              <div className="row gap">
                <button type="submit" className="icon" disabled={reschedBusy}>
                  <Icon name="check" size={18} /> {reschedBusy ? "Saving…" : "Confirm reschedule"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setReschedTarget(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRequest && (
        <div className="modal-backdrop" onClick={() => setShowRequest(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitRequest} style={{ display: "contents" }}>
              <div className="modal-head">
                <h3 className="icon"><Icon name="event" size={18} /> Request an appointment</h3>
                <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowRequest(false)}>
                  <Icon name="close" />
                </button>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Pick an available slot with Dr. {assoc?.dentist?.name}. They'll confirm your request.
              </p>
              {reqError && <div className="error">{reqError}</div>}
              <label>
                <span className="lbl">Purpose <span className="muted">(optional)</span></span>
                <input
                  placeholder="e.g. Checkup, Toothache"
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                />
              </label>
              <SlotPicker value={reqDate} onChange={(iso) => setReqDate(iso)} />
              <div className="row gap">
                <button type="submit" className="icon" disabled={reqBusy}>
                  <Icon name="schedule_send" size={18} /> {reqBusy ? "Sending…" : "Send request"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowRequest(false)}>
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
