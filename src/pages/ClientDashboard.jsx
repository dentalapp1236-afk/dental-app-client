import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [treatments, setTreatments] = useState([]);

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
      }
    })();
  }, []);

  return (
    <div className="page">
      <h1>Hello, {user.name}</h1>

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
                  <td>{new Date(a.date).toLocaleString()}</td>
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
                  <td>{new Date(t.date).toLocaleDateString()}</td>
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
