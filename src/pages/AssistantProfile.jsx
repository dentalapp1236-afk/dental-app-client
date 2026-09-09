import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Icon from "../components/Icon";
import { formatDate } from "../utils/date";

const fmtRange = (s, e) => `${s ? formatDate(s) : "—"} — ${e ? formatDate(e) : "Present"}`;

// Read-only view of an assistant's professional profile + work history, for a
// dentist (from the Staff page).
export default function AssistantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/assistants/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || "Could not load profile."));
  }, [id]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page"><p className="muted">Loading…</p></div>;

  const a = data.assistant;
  return (
    <div className="page">
      <div className="page-head">
        <button className="btn-secondary icon" onClick={() => navigate(-1)}>
          <Icon name="arrow_back" size={18} /> Back
        </button>
      </div>

      <div className="card" style={{ maxWidth: 620, padding: 20 }}>
        <div className="ap-header">
          {a.image ? (
            <img className="ap-avatar" src={a.image} alt={a.name} />
          ) : (
            <div className="ap-avatar" style={{ display: "grid", placeItems: "center", background: "var(--b-50)" }}>
              <Icon name="person" size={32} />
            </div>
          )}
          <div>
            <h2 style={{ margin: 0 }}>{a.name}</h2>
            <div className="muted">{a.title || "Dental assistant"}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {a.yearsOfExperience != null && `${a.yearsOfExperience} yr${a.yearsOfExperience === 1 ? "" : "s"} experience`}
              {a.location ? `${a.yearsOfExperience != null ? " · " : ""}${a.location}` : ""}
            </div>
          </div>
        </div>

        {a.about && <p style={{ marginTop: 16 }}>{a.about}</p>}

        {a.skills?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {a.skills.map((s) => <span key={s} className="ap-skill">{s}</span>)}
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 620, marginTop: 16, padding: 20 }}>
        <h3 className="icon" style={{ marginTop: 0 }}><Icon name="work_history" size={18} /> Work history</h3>
        {data.history.length === 0 ? (
          <p className="muted">No clinic history yet.</p>
        ) : (
          <ul className="work-history">
            {data.history.map((h, i) => (
              <li key={i}>
                <div className="wh-clinic">
                  <Icon name="apartment" size={16} /> {h.clinic}
                  {h.status === "active" && <span className="wh-current">Current</span>}
                </div>
                <div className="muted wh-range">{fmtRange(h.startedAt, h.endedAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
