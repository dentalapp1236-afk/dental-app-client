import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const pad = (n) => String(n).padStart(2, "0");
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const todayStr = () => dayStr(new Date());

// Matches the day labels the dentist picks at sign up (Register WEEKDAYS).
// JS getDay(): 0=Sun … 6=Sat.
const JS_DAY_TO_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "09:00" -> "9:00 AM"
const fmt12 = (s) => {
  const [h, m] = s.split(":").map(Number);
  const ap = h < 12 ? "AM" : "PM";
  return `${((h + 11) % 12) + 1}:${pad(m)} ${ap}`;
};

const toMin = (s) => {
  const [h, m] = String(s).split(":").map(Number);
  return h * 60 + (m || 0);
};

const buildSlots = (startMin, endMin, stepMin) => {
  const out = [];
  for (let t = startMin; t < endMin; t += stepMin) {
    out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return out;
};

// Interactive day + time-slot picker. `value` is an ISO datetime string (or "").
// Slot hours come from the clinic's availability (set by the dentist at sign up);
// when none is configured, falls back to 9:00–6:00.
export default function SlotPicker({ value, onChange, excludeId, stepMin = 15 }) {
  const valueDate = value ? new Date(value) : null;
  const [day, setDay] = useState(valueDate ? dayStr(valueDate) : todayStr());
  const [bookedISO, setBookedISO] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pull booked datetimes + clinic hours for the selected day from the server.
  useEffect(() => {
    if (!day) return;
    const from = new Date(`${day}T00:00:00`);
    const to = new Date(`${day}T00:00:00`);
    to.setDate(to.getDate() + 1);
    let active = true;
    setLoading(true);
    api
      .get("/appointments/booked", {
        params: { from: from.toISOString(), to: to.toISOString(), exclude: excludeId },
        skipLoader: true,
      })
      .then((r) => {
        if (!active) return;
        setBookedISO(r.data.slots || []);
        setAvailability(r.data.availability || []);
      })
      .catch(() => {
        if (!active) return;
        setBookedISO([]);
        setAvailability([]);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [day, excludeId]);

  // Clinic hours for the selected weekday (or null when the clinic is closed).
  const hours = useMemo(() => {
    const label = JS_DAY_TO_LABEL[new Date(`${day}T00:00:00`).getDay()];
    const entry = availability.find((a) => a.day === label);
    if (entry && entry.start && entry.end) return { start: toMin(entry.start), end: toMin(entry.end) };
    // No availability configured at all -> sensible default so scheduling still works.
    if (availability.length === 0) return { start: 9 * 60, end: 18 * 60 };
    return null; // configured, but closed on this weekday
  }, [availability, day]);

  const slots = useMemo(
    () => (hours ? buildSlots(hours.start, hours.end, stepMin) : []),
    [hours, stepMin]
  );

  const bookedSet = useMemo(() => {
    const s = new Set();
    for (const iso of bookedISO) {
      const d = new Date(iso);
      if (dayStr(d) === day) s.add(hm(d));
    }
    return s;
  }, [bookedISO, day]);

  const selectedHM = valueDate && dayStr(valueDate) === day ? hm(valueDate) : null;
  const now = Date.now();

  const pick = (slot) => {
    const [h, m] = slot.split(":").map(Number);
    onChange(new Date(`${day}T${pad(h)}:${pad(m)}:00`).toISOString());
  };

  return (
    <div className="slotpicker">
      <label>
        <span className="lbl">Day</span>
        <input type="date" min={todayStr()} value={day} onChange={(e) => setDay(e.target.value)} />
      </label>

      <div className="slot-legend">
        <span><i className="slot-dot slot-dot-free" /> Available</span>
        <span><i className="slot-dot slot-dot-booked" /> Booked</span>
        <span><i className="slot-dot slot-dot-sel" /> Selected</span>
      </div>

      {loading ? (
        <p className="muted" style={{ margin: "8px 0" }}>Loading slots…</p>
      ) : !hours ? (
        <p className="muted" style={{ margin: "8px 0" }}>The clinic is closed on this day. Please pick another day.</p>
      ) : (
        <div className="slot-grid">
          {slots.map((slot) => {
            const [h, m] = slot.split(":").map(Number);
            const slotTime = new Date(`${day}T${pad(h)}:${pad(m)}:00`).getTime();
            const booked = bookedSet.has(slot);
            const past = slotTime < now;
            const selected = selectedHM === slot;
            return (
              <button
                key={slot}
                type="button"
                className={`slot${selected ? " selected" : ""}${booked ? " booked" : ""}`}
                disabled={booked || past}
                title={booked ? "Booked" : past ? "Past" : "Available"}
                onClick={() => pick(slot)}
              >
                {fmt12(slot)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
