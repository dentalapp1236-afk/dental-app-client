import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import AvailabilityEditor from "../components/AvailabilityEditor";
import DayOverridesEditor from "../components/DayOverridesEditor";

const DEFAULT_HOURS = ["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => ({
  day,
  start: "09:00",
  end: "17:00",
}));

// Clinic-operational settings — opening hours, slot length, and map location.
// These belong to the CLINIC (the dentist who owns it); an assistant editing
// this page edits the same clinic record on the dentist's behalf. Both roles go
// through /auth/clinic-settings so the data always lives on the clinic owner.
export default function Settings() {
  const { user, updateUser } = useAuth();

  const [availability, setAvailability] = useState(DEFAULT_HOURS);
  const [slotDuration, setSlotDuration] = useState(15);
  const [dayOverrides, setDayOverrides] = useState([]);
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locStatus, setLocStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Load the clinic's current settings (works for both dentist and assistant).
  useEffect(() => {
    let active = true;
    api
      .get("/auth/clinic-settings")
      .then(({ data }) => {
        if (!active) return;
        setAvailability(
          data.availability?.length
            ? data.availability.map((a) => ({ day: a.day, start: a.start, end: a.end }))
            : DEFAULT_HOURS
        );
        setSlotDuration(data.slotDuration || 15);
        setDayOverrides(data.dayOverrides || []);
        if (data.location?.coordinates) {
          setCoords({
            latitude: data.location.coordinates[1],
            longitude: data.location.coordinates[0],
          });
        }
      })
      .catch(() => active && setError("Could not load clinic settings."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

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
      const payload = { availability, slotDuration: Number(slotDuration), dayOverrides };
      if (coords) {
        payload.latitude = coords.latitude;
        payload.longitude = coords.longitude;
      }
      const { data } = await api.put("/auth/clinic-settings", payload);
      // Reflect the server's cleaned list (past-dated exceptions are pruned).
      setDayOverrides(data.dayOverrides || []);
      // Keep the dentist's own session in sync so other pages (e.g. their public
      // profile) reflect the change. An assistant's own record isn't the clinic,
      // so there's nothing to merge for them.
      if (user.role === "dentist") {
        updateUser({
          ...user,
          availability: data.availability,
          slotDuration: data.slotDuration,
          location: data.location || user.location,
        });
      }
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

      {loading ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>Loading clinic settings…</p>
        </div>
      ) : (
      <form className="card" onSubmit={saveHours}>
        <h3 className="icon"><Icon name="schedule" size={18} /> Clinic hours</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Set opening and closing times for each day you're open. These control the
          time slots you and your patients can book.
        </p>
        {error && <div className="error">{error}</div>}
        <AvailabilityEditor value={availability} onChange={setAvailability} />

        <hr className="divider" />

        <h3 className="icon"><Icon name="timer" size={18} /> Appointment slot length</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          How long each bookable time slot is. Clinic hours are split into slots of
          this length for you and your patients.
        </p>
        <label style={{ maxWidth: 260 }}>
          Slot duration
          <select
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value))}
          >
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </label>

        <hr className="divider" />

        <h3 className="icon"><Icon name="event_busy" size={18} /> Day-specific hours &amp; time off</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Override the normal hours for a specific date — e.g. leaving early one
          day, or a day off. Patients won't be able to book outside the adjusted
          window for that date. Past dates are cleared automatically.
        </p>
        <DayOverridesEditor value={dayOverrides} onChange={setDayOverrides} />

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
      )}

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
