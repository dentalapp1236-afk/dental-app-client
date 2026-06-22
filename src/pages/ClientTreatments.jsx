import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatDate } from "../utils/date";
import Icon from "../components/Icon";
import { SkeletonCards } from "../components/Skeleton";

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
        <SkeletonCards count={4} />
      ) : treatments.length === 0 ? (
        <p className="muted">No treatments recorded yet.</p>
      ) : (
        <div className="appt-list">
          {[...treatments]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((t) => (
              <div key={t._id} className="appt-card">
                <div className="appt-card-head">
                  <span className="appt-when icon">
                    <Icon name="medical_services" size={18} /> {t.procedure}
                  </span>
                  {t.cost > 0 ? (
                    <span className={`st ${t.paid ? "st-completed" : "st-pending"}`}>
                      {t.paid ? "Paid" : "Unpaid"}
                    </span>
                  ) : (
                    <span className="st st-scheduled">No charge</span>
                  )}
                </div>
                <div className="appt-card-body">
                  <span className="icon"><Icon name="event" size={16} /> {formatDate(t.date)}</span>
                  {t.toothNumber && (
                    <span className="icon"><Icon name="dentistry" size={16} /> Tooth {t.toothNumber}</span>
                  )}
                  {t.diagnosis && (
                    <span className="icon"><Icon name="clinical_notes" size={16} /> {t.diagnosis}</span>
                  )}
                  {t.cost > 0 && (
                    <span className="icon"><Icon name="payments" size={16} /> {money(t.cost)}</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
