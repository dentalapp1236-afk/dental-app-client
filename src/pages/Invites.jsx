import { useState } from "react";
import api from "../api/axios";
import Icon from "../components/Icon";
import { useClinic } from "../context/ClinicContext";

// Assistant view: pending clinic invites to accept or decline.
export default function Invites() {
  const { pending, refresh } = useClinic();
  const [busy, setBusy] = useState(null);

  const act = async (e, action) => {
    setBusy(e._id);
    try {
      await api.post(`/engagements/${e._id}/${action}`);
      if (action === "accept") {
        // Jump straight into the newly-joined clinic.
        localStorage.setItem("activeClinic", e.dentist._id);
        window.location.assign("/dentist");
        return;
      }
      await refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Could not update the invite.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="icon"><Icon name="mail" /> Clinic invites</h1>
      </div>
      {pending.length === 0 ? (
        <p className="muted">No pending invites. When a dentist invites you to their clinic, it'll show here.</p>
      ) : (
        pending.map((e) => (
          <div className="card" key={e._id} style={{ padding: 16, marginBottom: 10, maxWidth: 520 }}>
            <strong>{e.dentist?.clinicName || e.dentist?.name || "A clinic"}</strong>
            <div className="muted" style={{ fontSize: 13 }}>invited you to join their clinic.</div>
            <div className="row gap" style={{ marginTop: 12, flexWrap: "wrap" }}>
              <button className="icon" disabled={busy === e._id} onClick={() => act(e, "accept")}>
                <Icon name="check_circle" size={18} /> Accept
              </button>
              <button className="btn-secondary icon" disabled={busy === e._id} onClick={() => act(e, "decline")}>
                <Icon name="cancel" size={18} /> Decline
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
