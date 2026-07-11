import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import AvailabilityEditor from "../components/AvailabilityEditor";

// Clinic-operational settings for the dentist: opening hours and map location.
// These used to live inside "My profile", which conflated who the dentist is
// with how the clinic runs — they now have a dedicated home here.
export default function Settings() {
  const { user, updateUser } = useAuth();

  const [availability, setAvailability] = useState(
    user.availability?.length
      ? user.availability.map((a) => ({ day: a.day, start: a.start, end: a.end }))
      : ["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => ({ day, start: "09:00", end: "17:00" }))
  );
  const [coords, setCoords] = useState(
    user.location?.coordinates
      ? { latitude: user.location.coordinates[1], longitude: user.location.coordinates[0] }
      : null
  );
  const [locStatus, setLocStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const captureLocation = () => {
    if (!navigator.geolocation) return setLocStatus("Geolocation not supported.");
    setLocStatus("Locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocStatus("Location captured ✓ — remember to save.");
      },
      (err) => setLocStatus(`Could not get location: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveHours = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { availability };
      if (coords) {
        payload.latitude = coords.latitude;
        payload.longitude = coords.longitude;
      }
      const { data } = await api.put("/auth/me", payload);
      updateUser(data.user);
      setSuccessMsg("Clinic settings updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save clinic settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="icon"><Icon name="settings" /> Settings</h1>
      </div>

      <form className="card" onSubmit={saveHours}>
        <h3 className="icon"><Icon name="schedule" size={18} /> Clinic hours</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Set opening and closing times for each day you're open. These control the
          time slots you and your patients can book.
        </p>
        {error && <div className="error">{error}</div>}
        <AvailabilityEditor value={availability} onChange={setAvailability} />

        <hr className="divider" />

        <h3 className="icon"><Icon name="location_on" size={18} /> Clinic location</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Used to show your clinic to nearby patients on "Find a dentist".
          Stand at your clinic and tap below to set it.
        </p>
        <button type="button" className="btn-secondary icon" onClick={captureLocation}>
          <Icon name="my_location" size={18} /> Update my location
        </button>
        {locStatus && <p className="muted" style={{ marginTop: 6 }}>{locStatus}</p>}
        {coords && (
          <p className="muted" style={{ marginTop: 4 }}>
            {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </p>
        )}

        <div className="row">
          <button type="submit" className="icon" disabled={saving}>
            <Icon name="save" size={18} /> {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>

      {successMsg && (
        <div className="modal-backdrop" onClick={() => setSuccessMsg("")}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon"><Icon name="check_circle" /></div>
            <h3 style={{ margin: 0 }}>{successMsg}</h3>
            <div className="row" style={{ justifyContent: "center" }}>
              <button type="button" className="icon" onClick={() => setSuccessMsg("")}>
                <Icon name="check" size={18} /> Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
