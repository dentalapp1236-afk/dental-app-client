import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { formatDate, formatDateTime } from "../utils/date";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import { Skeleton, SkeletonTable } from "../components/Skeleton";

export default function DentistDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    clients: 0,
    upcoming: 0,
    treatments: 0,
  });
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [clientsRes, apptsRes, trRes] = await Promise.all([
          api.get("/clients"),
          api.get("/appointments"),
          api.get("/treatments"),
        ]);
        const now = new Date();
        const upcomingAppts = apptsRes.data.filter(
          (a) => new Date(a.date) >= now && a.status === "scheduled"
        );
        setStats({
          clients: clientsRes.data.length,
          upcoming: upcomingAppts.length,
          treatments: trRes.data.length,
        });
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
        <h1 className="icon"><Icon name="waving_hand" /> Welcome, Dr. {user.name}</h1>
        <div className="summary">
          {[0, 1, 2].map((i) => (
            <div className="summary-item" key={i}>
              <Skeleton width={36} height={26} />
              <Skeleton width={70} height={12} />
            </div>
          ))}
        </div>
        <h2 className="icon"><Icon name="event_upcoming" /> Next appointments</h2>
        <SkeletonTable rows={4} cols={4} />
      </div>
    );

  return (
    <div className="page">
      <h1 className="icon"><Icon name="waving_hand" /> Welcome, Dr. {user.name}</h1>
      <div className="summary">
        <Link to="/clients" className="summary-item">
          <span className="summary-value">{stats.clients}</span>
          <span className="summary-label">Clients</span>
        </Link>
        <Link to="/appointments" className="summary-item">
          <span className="summary-value">{stats.upcoming}</span>
          <span className="summary-label">Upcoming</span>
        </Link>
        <Link to="/treatments" className="summary-item">
          <span className="summary-value">{stats.treatments}</span>
          <span className="summary-label">Treatments</span>
        </Link>
      </div>

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
              <tr key={a._id}>
                <td>{formatDateTime(a.date)}</td>
                <td>{a.client?.name}</td>
                <td>{a.reason}</td>
                <td>{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
