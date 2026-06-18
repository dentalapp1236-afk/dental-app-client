import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const isDentist = user.role === "dentist";
  const isVendor = user.role === "vendor";

  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    // client
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.substring(0, 10) : "",
    address: user.address || "",
    // vendor
    companyName: user.companyName || "",
    // dentist
    clinicName: user.clinicName || "",
    specialization: user.specialization || "",
    yearsOfExperience: user.yearsOfExperience ?? "",
    about: user.about || "",
    start: user.availability?.[0]?.start || "09:00",
    end: user.availability?.[0]?.end || "17:00",
  });
  const [days, setDays] = useState(
    user.availability?.length ? user.availability.map((a) => a.day) : ["Mon", "Tue", "Wed", "Thu", "Fri"]
  );
  const [coords, setCoords] = useState(
    user.location?.coordinates
      ? { latitude: user.location.coordinates[1], longitude: user.location.coordinates[0] }
      : null
  );
  const [locStatus, setLocStatus] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const toggleDay = (d) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const captureLocation = () => {
    if (!navigator.geolocation) return setLocStatus("Geolocation not supported.");
    setLocStatus("Locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocStatus("Location updated ✓");
      },
      (err) => setLocStatus(`Could not get location: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { name: form.name, phone: form.phone };
      if (user.role === "client") {
        payload.dateOfBirth = form.dateOfBirth;
        payload.address = form.address;
      }
      if (isVendor) payload.companyName = form.companyName;
      if (isDentist) {
        payload.clinicName = form.clinicName;
        payload.specialization = form.specialization;
        payload.yearsOfExperience = form.yearsOfExperience;
        payload.about = form.about;
        payload.address = form.address;
        payload.availability = days.map((day) => ({ day, start: form.start, end: form.end }));
        if (coords) {
          payload.latitude = coords.latitude;
          payload.longitude = coords.longitude;
        }
      }
      const { data } = await api.put("/auth/me", payload);
      updateUser(data.user);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="icon"><Icon name="account_circle" /> My profile</h1>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <h3 className="icon"><Icon name="badge" size={18} /> Account</h3>
        {error && <div className="error">{error}</div>}
        {saved && <div className="info-banner">Profile saved.</div>}

        <div className="grid-2">
          <label>
            Full name
            <input name="name" required value={form.name} onChange={handleChange} />
          </label>
          <label>
            Email
            <input value={user.email} disabled />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={handleChange} />
          </label>
          <label>
            Role
            <input value={user.role} disabled style={{ textTransform: "capitalize" }} />
          </label>
        </div>

        {user.role === "client" && (
          <div className="grid-2">
            <label>
              Date of birth
              <input type="date" name="dateOfBirth" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={handleChange} />
            </label>
            <label>
              Address
              <input name="address" value={form.address} onChange={handleChange} />
            </label>
          </div>
        )}

        {isVendor && (
          <label>
            Company name
            <input name="companyName" value={form.companyName} onChange={handleChange} />
          </label>
        )}

        {isDentist && (
          <>
            <hr className="divider" />
            <h3 className="icon"><Icon name="medical_information" size={18} /> Dentist profile</h3>
            <label>
              Clinic name
              <input name="clinicName" value={form.clinicName} onChange={handleChange} />
            </label>
            <div className="grid-2">
              <label>
                Specialization
                <input name="specialization" value={form.specialization} onChange={handleChange} />
              </label>
              <label>
                Years of experience
                <input
                  type="number"
                  name="yearsOfExperience"
                  min="0"
                  step="1"
                  value={form.yearsOfExperience}
                  onKeyDown={(e) => ["-", "+", "e", "E", "."].includes(e.key) && e.preventDefault()}
                  onChange={handleChange}
                />
              </label>
            </div>
            <label>
              About
              <textarea name="about" rows={3} value={form.about} onChange={handleChange} />
            </label>
            <label>
              Clinic address
              <input name="address" value={form.address} onChange={handleChange} />
            </label>

            <div>
              <span className="field-label">Available days</span>
              <div className="day-toggles">
                {WEEKDAYS.map((d) => (
                  <button
                    type="button"
                    key={d}
                    className={`chip ${days.includes(d) ? "chip-active" : ""}`}
                    onClick={() => toggleDay(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid-2">
              <label>
                Opens at
                <input type="time" name="start" value={form.start} onChange={handleChange} />
              </label>
              <label>
                Closes at
                <input type="time" name="end" value={form.end} onChange={handleChange} />
              </label>
            </div>

            <div>
              <span className="field-label">Clinic location</span>
              <button type="button" className="btn-secondary icon" onClick={captureLocation}>
                <Icon name="my_location" size={18} /> Update my location
              </button>
              {locStatus && <p className="muted" style={{ marginTop: 6 }}>{locStatus}</p>}
              {coords && (
                <p className="muted" style={{ marginTop: 4 }}>
                  {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                </p>
              )}
            </div>
          </>
        )}

        <div className="row">
          <button type="submit" className="icon" disabled={saving}>
            <Icon name="save" size={18} /> {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
