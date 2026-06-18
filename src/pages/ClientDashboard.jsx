import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { formatDate, formatDateTime } from "../utils/date";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import StarRating from "../components/StarRating";
import { SkeletonTable } from "../components/Skeleton";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Association
  const [assoc, setAssoc] = useState(null); // { dentist, pending }
  const [showLeave, setShowLeave] = useState(false);
  const [leaveRating, setLeaveRating] = useState(5);
  const [leaveComment, setLeaveComment] = useState("");
  const [leaving, setLeaving] = useState(false);

  const loadAssoc = () =>
    api.get("/associations/me").then((r) => setAssoc(r.data)).catch(() => {});

  useEffect(() => {
    (async () => {
      try {
        const [a, t] = await Promise.all([
          api.get("/appointments"),
          api.get("/treatments"),
        ]);
        setAppointments(a.data);
        setTreatments(t.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    loadAssoc();
  }, []);

  const disassociate = async () => {
    setLeaving(true);
    try {
      await api.post("/associations/disassociate", {
        rating: leaveRating,
        comment: leaveComment,
      });
      setShowLeave(false);
      setLeaveComment("");
      await loadAssoc();
    } catch (err) {
      console.error(err);
    } finally {
      setLeaving(false);
    }
  };

  if (loading)
    return (
      <div className="page">
        <h1 className="icon"><Icon name="waving_hand" /> Hello, {user.name}</h1>
        <h2 className="icon"><Icon name="calendar_month" /> My appointments</h2>
        <SkeletonTable rows={4} cols={5} />
        <h2 className="icon"><Icon name="medical_services" /> My treatment history</h2>
        <SkeletonTable rows={4} cols={6} />
      </div>
    );

  return (
    <div className="page">
      <h1 className="icon"><Icon name="waving_hand" /> Hello, {user.name}</h1>

      {/* My dentist / association status */}
      <div className="card" style={{ maxWidth: "none" }}>
        <h3 className="icon"><Icon name="medical_information" size={18} /> My dentist</h3>
        {assoc?.dentist ? (
          <div className="row gap" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <strong>Dr. {assoc.dentist.name}</strong>
              {assoc.dentist.clinicName && <span className="muted"> · {assoc.dentist.clinicName}</span>}
            </div>
            <button className="btn-secondary icon" onClick={() => setShowLeave(true)}>
              <Icon name="logout" size={18} /> Leave / switch dentist
            </button>
          </div>
        ) : assoc?.pending ? (
          <p className="muted">
            Request pending with Dr. {assoc.pending.dentist?.name}. You'll be notified once they respond.
          </p>
        ) : (
          <div className="row gap" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <span className="muted">You're not associated with a dentist yet.</span>
            <Link to="/find-dentist" className="btn-secondary icon" style={{ textDecoration: "none" }}>
              <Icon name="person_search" size={18} /> Find a dentist
            </Link>
          </div>
        )}
      </div>

      {showLeave && (
        <div className="modal-backdrop" onClick={() => setShowLeave(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Leave Dr. {assoc?.dentist?.name}?</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Please rate your experience before you go.
            </p>
            <StarRating value={leaveRating} onChange={setLeaveRating} size={28} />
            <textarea
              rows={3}
              placeholder="Optional review…"
              value={leaveComment}
              onChange={(e) => setLeaveComment(e.target.value)}
            />
            <div className="row gap">
              <button className="btn-danger" onClick={disassociate} disabled={leaving}>
                {leaving ? "Leaving…" : "Confirm & leave"}
              </button>
              <button className="btn-secondary" onClick={() => setShowLeave(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <section>
        <h2 className="icon">
          <Icon name="calendar_month" /> My appointments
        </h2>
        {appointments.length === 0 ? (
          <p className="muted">No appointments yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Dentist</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a._id}>
                  <td>{formatDateTime(a.date)}</td>
                  <td>{a.dentist?.name}</td>
                  <td>{a.reason}</td>
                  <td>{a.status}</td>
                  <td>{a.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="icon">
          <Icon name="medical_services" /> My treatment history
        </h2>
        {treatments.length === 0 ? (
          <p className="muted">No treatments recorded.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Procedure</th>
                <th>Tooth</th>
                <th>Diagnosis</th>
                <th>Cost</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {treatments.map((t) => (
                <tr key={t._id}>
                  <td>{formatDate(t.date)}</td>
                  <td>{t.procedure}</td>
                  <td>{t.toothNumber || "—"}</td>
                  <td>{t.diagnosis || "—"}</td>
                  <td>{t.cost}</td>
                  <td>{t.paid ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
