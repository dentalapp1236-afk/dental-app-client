import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { formatDateTime } from "../utils/date";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import { SkeletonTable } from "../components/Skeleton";

export default function DentistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/appointments");
        const now = new Date();
        const upcomingAppts = data.filter(
          (a) => new Date(a.date) >= now && a.status === "scheduled"
        );
        setUpcoming(upcomingAppts.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="page">
        <h1 className="icon"><Icon name="waving_hand" /> Welcome, {user.role === "dentist" ? "Dr. " : ""}{user.name}</h1>
        <h2 className="icon"><Icon name="event_upcoming" /> Next appointments</h2>
        <SkeletonTable rows={4} cols={4} />
      </div>
    );

  return (
    <div className="page">
      <h1 className="icon"><Icon name="waving_hand" /> Welcome, {user.role === "dentist" ? "Dr. " : ""}{user.name}</h1>

      <h2 className="icon">
        <Icon name="event_upcoming" /> Next appointments
      </h2>
      {upcoming.length === 0 ? (
        <p className="muted">No upcoming appointments.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((a) => (
              <tr
                key={a._id}
                className="row-click"
                onClick={() => setSelected(a)}
                title="View appointment details"
              >
                <td>{formatDateTime(a.date)}</td>
                <td>{a.client?.name}</td>
                <td>{a.reason || "—"}</td>
                <td>{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
                <span>{selected.reason || "No reason given"}</span>
              </div>
              {selected.notes && (
                <div className="detail-row">
                  <Icon name="notes" size={18} />
                  <span>{selected.notes}</span>
                </div>
              )}
              <div className="detail-row">
                <Icon name="info" size={18} />
                <span className={selected.status === "scheduled" ? "badge" : "tag"}>{selected.status}</span>
              </div>
            </div>
            <div className="row gap">
              {selected.client?._id && (
                <button
                  className="icon"
                  onClick={() => navigate(`/clients/${selected.client._id}`)}
                >
                  <Icon name="history" size={18} /> View client record
                </button>
              )}
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
