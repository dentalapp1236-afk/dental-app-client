import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatDate } from "../utils/date";
import Icon from "../components/Icon";
import { SkeletonTable } from "../components/Skeleton";

const money = (n) => `Rs ${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function ClientTreatments() {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/treatments")
      .then((r) => setTreatments(r.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h1 className="icon"><Icon name="medical_services" /> My treatment history</h1>

      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : treatments.length === 0 ? (
        <p className="muted">No treatments recorded yet.</p>
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
                <td>{t.cost ? money(t.cost) : "No charge"}</td>
                <td>{t.paid ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
