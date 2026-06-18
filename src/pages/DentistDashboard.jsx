import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatDateTime } from "../utils/date";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import { SkeletonTable } from "../components/Skeleton";

export default function DentistDashboard() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <h1 className="icon"><Icon name="waving_hand" /> Welcome, Dr. {user.name}</h1>
        <h2 className="icon"><Icon name="event_upcoming" /> Next appointments</h2>
        <SkeletonTable rows={4} cols={4} />
      </div>
    );

  return (
    <div className="page">
      <h1 className="icon"><Icon name="waving_hand" /> Welcome, Dr. {user.name}</h1>

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
