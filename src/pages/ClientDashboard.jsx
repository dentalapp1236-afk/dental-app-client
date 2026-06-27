import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { formatDateTime } from "../utils/date";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import StarRating from "../components/StarRating";
import AppointmentActions from "../components/AppointmentActions";

const statusLabel = (s) =>
  s === "pending" ? "Awaiting confirmation" : s === "no_show" ? "No-show" : s;

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toMin = (s) => {
  const [h, m] = String(s).split(":").map(Number);
  return h * 60 + (m || 0);
};
const fmt12 = (s) => {
  const [h, m] = String(s).split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// Live open/closed status for a clinic, from its per-day availability.
// green = open now, yellow = opens later today, red = closed.
const clinicStatus = (availability) => {
  if (!availability?.length) return null;
  const now = new Date();
  const entry = availability.find((a) => a.day === WEEK[now.getDay()]);
  if (!entry || !entry.start || !entry.end)
    return { kind: "closed", icon: "block", text: "Closed today" };
  const start = toMin(entry.start);
  const end = toMin(entry.end);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin >= end) return { kind: "closed", icon: "block", text: "Closed for today" };
  if (nowMin < start) {
    const diff = start - nowMin;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    const inText = h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
    return { kind: "soon", icon: "schedule", text: `Opens in ${inText} (${fmt12(entry.start)})` };
  }
  return { kind: "open", icon: "check_circle", text: `Open now · closes ${fmt12(entry.end)}` };
};

// Patient "Home" tab: association status + upcoming appointments. Full appointment
// and treatment history live in their own tabs.
export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assoc, setAssoc] = useState(null); // { dentist, pending }
  const [upcoming, setUpcoming] = useState([]);
  const [showLeave, setShowLeave] = useState(false);
  const [leaveRating, setLeaveRating] = useState(5);
  const [leaveComment, setLeaveComment] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [assocNotice, setAssocNotice] = useState("");

  const loadAssoc = () =>
    api.get("/associations/me").then((r) => setAssoc(r.data)).catch(() => {});

  // Upcoming = active (scheduled or pending) appointments still in the future.
  const loadUpcoming = () =>
    api
      .get("/appointments", { skipLoader: true })
      .then((r) => {
        const now = Date.now();
        const list = (r.data || [])
          .filter(
            (a) =>
              ["scheduled", "pending"].includes(a.status) &&
              new Date(a.date).getTime() >= now
          )
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        setUpcoming(list);
      })
      .catch(() => {});

  useEffect(() => {
    loadAssoc();
    loadUpcoming();
  }, []);

  // If the patient arrived via the public "Associate with this clinic" flow,
  // send the association request now that they're signed in.
  useEffect(() => {
    const raw = sessionStorage.getItem("pendingAssociation");
    if (!raw) return;
    sessionStorage.removeItem("pendingAssociation");
    let pend;
    try {
      pend = JSON.parse(raw);
    } catch {
      return;
    }
    if (!pend?.id) return;
    api
      .post("/associations/request", { dentistId: pend.id })
      .then(() => {
        setAssocNotice(
          `Request sent to Dr. ${pend.name || "your selected dentist"} — you'll be notified once they confirm.`
        );
        loadAssoc();
        window.dispatchEvent(new Event("association-changed"));
      })
      .catch((err) =>
        setAssocNotice(err.response?.data?.message || "Could not send your association request.")
      );
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
      await loadUpcoming();
      window.dispatchEvent(new Event("association-changed"));
    } catch (err) {
      console.error(err);
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="page">
      <h1 className="icon"><Icon name="waving_hand" /> Hello, {user.name}</h1>

      {assocNotice && (
        <div className="card" style={{ maxWidth: "none", borderColor: "var(--primary)" }}>
          <p className="icon" style={{ margin: 0 }}>
            <Icon name="check_circle" size={18} /> {assocNotice}
          </p>
        </div>
      )}

      {/* My dentist / association status */}
      <div className="card" style={{ maxWidth: "none" }}>
        <h3 className="icon"><Icon name="medical_information" size={18} /> My dentist</h3>
        {assoc === null ? (
          <p className="muted">Loading…</p>
        ) : assoc.dentist ? (
          <div
            onClick={() => navigate(`/dentists/${assoc.dentist._id}`)}
            title="View dentist details"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <Avatar src={assoc.dentist.image} name={assoc.dentist.name} size={96} />
            <div>
              <strong>Dr. {assoc.dentist.name}</strong>
              {assoc.dentist.clinicName && (
                <div className="muted">{assoc.dentist.clinicName}</div>
              )}
              {assoc.dentist.specialization && (
                <div className="muted" style={{ fontSize: 13 }}>{assoc.dentist.specialization}</div>
              )}
            </div>
            {(() => {
              const st = clinicStatus(assoc.dentist.availability);
              return st ? (
                <span className={`clinic-badge ${st.kind}`}>
                  <Icon name={st.icon} size={16} /> {st.text}
                </span>
              ) : null;
            })()}
            {assoc.dentist.reviewCount > 0 && (
              <div className="row gap" style={{ alignItems: "center" }}>
                <StarRating value={assoc.dentist.rating || 0} size={16} />
                <span className="muted" style={{ fontSize: 13 }}>
                  {Number(assoc.dentist.rating || 0).toFixed(1)} ({assoc.dentist.reviewCount})
                </span>
              </div>
            )}
            <div
              className="row gap"
              style={{ flexWrap: "wrap", justifyContent: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                to={`/dentists/${assoc.dentist._id}`}
                className="btn-secondary icon"
                style={{ textDecoration: "none", borderColor: "var(--primary)", color: "var(--primary)" }}
              >
                <Icon name="info" size={18} /> View details
              </Link>
              <button className="btn-secondary icon" onClick={() => setShowLeave(true)}>
                <Icon name="logout" size={18} /> Leave / switch dentist
              </button>
            </div>
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

      {/* Upcoming appointments (active / pending only) */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="icon" style={{ marginBottom: 4 }}>
            <Icon name="event_upcoming" /> Upcoming appointment{upcoming.length > 1 ? "s" : ""}
          </h2>
          <div className="appt-list">
            {upcoming.map((a) => (
              <div key={a._id} className="appt-card">
                <div className="appt-card-head">
                  <span className="appt-when icon">
                    <Icon name="schedule" size={18} /> {formatDateTime(a.date)}
                  </span>
                  <span className={`st st-${a.status}`}>{statusLabel(a.status)}</span>
                </div>
                <div className="appt-card-body">
                  {a.client && a.client._id !== user._id && (
                    <span className="icon"><Icon name="child_care" size={16} /> For {a.client.name}</span>
                  )}
                  <span className="icon"><Icon name="person" size={16} /> Dr. {a.dentist?.name}</span>
                  {a.dentist?.clinicName && (
                    <span className="icon"><Icon name="apartment" size={16} /> {a.dentist.clinicName}</span>
                  )}
                  {a.reason && (
                    <span className="icon"><Icon name="medical_services" size={16} /> {a.reason}</span>
                  )}
                </div>
                <div className="row gap" style={{ flexWrap: "wrap" }}>
                  {a.dentist?.location?.coordinates?.length === 2 && (
                    <a
                      className="btn-secondary icon"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${a.dentist.location.coordinates[1]},${a.dentist.location.coordinates[0]}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none", borderColor: "var(--primary)", color: "var(--primary)" }}
                    >
                      <Icon name="directions" size={18} /> Directions
                    </a>
                  )}
                  <AppointmentActions appointment={a} onChanged={loadUpcoming} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
    </div>
  );
}
