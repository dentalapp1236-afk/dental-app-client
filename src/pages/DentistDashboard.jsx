import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

export default function DentistDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    clients: 0,
    upcoming: 0,
    treatments: 0,
  });
  const [upcoming, setUpcoming] = useState([]);

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
      }
    })();
  }, []);

  return (
    <div className="page">
      <h1>Welcome, Dr. {user.name}</h1>
      <div className="stats">
        <Link to="/clients" className="stat-card">
          <Icon name="group" size={36} className="stat-icon" />
          <div className="stat-value">{stats.clients}</div>
          <div className="stat-label">Clients</div>
        </Link>
        <Link to="/appointments" className="stat-card">
          <Icon name="calendar_month" size={36} className="stat-icon" />
          <div className="stat-value">{stats.upcoming}</div>
          <div className="stat-label">Upcoming appointments</div>
        </Link>
        <Link to="/treatments" className="stat-card">
          <Icon name="medical_services" size={36} className="stat-icon" />
          <div className="stat-value">{stats.treatments}</div>
          <div className="stat-label">Treatments recorded</div>
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
                <td>{new Date(a.date).toLocaleString()}</td>
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
