import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Icon from "./Icon";

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
//
// Optional props:
//  - dentistId: fetch a specific dentist's booked slots from the public endpoint
//    (used on the public dentist profile) instead of the viewer's own clinic.
//  - availabilityOverride: use this availability array instead of the fetched one.
//  - readOnly: display availability only — slots aren't selectable.
export default function SlotPicker({
  value,
  onChange,
  excludeId,
  stepMin = 15,
  dentistId,
  availabilityOverride,
  readOnly = false,
  initialDay,
  allowPast = false, // when editing a passed appointment, don't block past days
}) {
  const valueDate = value ? new Date(value) : null;
  // Pre-select a day (e.g. "Add" tapped on a day header) without picking a time,
  // so the dentist still has to choose an actual slot.
  const [day, setDay] = useState(
    valueDate ? dayStr(valueDate) : initialDay || todayStr()
  );
  const [bookedISO, setBookedISO] = useState([]);
  const [fetchedAvailability, setFetchedAvailability] = useState([]);
  // Slot length (minutes) as configured by the dentist; falls back to `stepMin`.
  const [fetchedStep, setFetchedStep] = useState(null);
  // Per-date exceptions to the weekly hours (early leave / day off).
  const [dayOverrides, setDayOverrides] = useState([]);
  const [loading, setLoading] = useState(false);
  // Whether the last fetch failed (slow connection / server cold start). We must
  // NOT fall back to default hours in that case — that would silently show the
  // wrong slots. `null` = never loaded yet; false = loaded OK; true = failed.
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);

  // Pull booked datetimes (+ clinic hours) for the selected day from the server.
  useEffect(() => {
    if (!day) return;
    const from = new Date(`${day}T00:00:00`);
    const to = new Date(`${day}T00:00:00`);
    to.setDate(to.getDate() + 1);
    const endpoint = dentistId ? `/dentists/${dentistId}/booked` : "/appointments/booked";
    let active = true;
    setLoading(true);
    setLoadError(false);
    api
      .get(endpoint, {
        params: { from: from.toISOString(), to: to.toISOString(), exclude: excludeId },
        skipLoader: true,
      })
      .then((r) => {
        if (!active) return;
        setBookedISO(r.data.slots || []);
        setFetchedAvailability(r.data.availability || []);
        setDayOverrides(r.data.dayOverrides || []);
        if (r.data.slotDuration) setFetchedStep(Number(r.data.slotDuration));
      })
      .catch(() => {
        if (!active) return;
        setBookedISO([]);
        setLoadError(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [day, excludeId, dentistId, reload]);

  const availability = availabilityOverride || fetchedAvailability;
  // Trust the fetched hours only when the request actually succeeded. When an
  // override is supplied (public profile), the parent already has the hours.
  const hoursKnown = !!availabilityOverride || !loadError;

  // Clinic hours for the selected day. A per-date override (early leave / day
  // off) wins over the normal weekly hours for that specific date.
  const hours = useMemo(() => {
    if (!hoursKnown) return null;
    const override = dayOverrides.find((o) => o.date === day);
    if (override) {
      if (override.closed) return null; // day off — no slots
      if (override.start && override.end)
        return { start: toMin(override.start), end: toMin(override.end) };
      // Malformed override -> fall through to weekly hours below.
    }
    const label = JS_DAY_TO_LABEL[new Date(`${day}T00:00:00`).getDay()];
    const entry = availability.find((a) => a.day === label);
    if (entry && entry.start && entry.end) return { start: toMin(entry.start), end: toMin(entry.end) };
    // No availability configured at all -> sensible default so scheduling still works.
    if (availability.length === 0) return { start: 9 * 60, end: 18 * 60 };
    return null; // configured, but closed on this weekday
  }, [availability, dayOverrides, day, hoursKnown]);

  // Prefer the dentist's configured slot length; fall back to the prop default.
  const effectiveStep = fetchedStep || stepMin;
  const slots = useMemo(
    () => (hours ? buildSlots(hours.start, hours.end, effectiveStep) : []),
    [hours, effectiveStep]
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
        <input
          type="date"
          min={allowPast ? undefined : todayStr()}
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </label>
      {day && (
        <p className="slot-day-words">
          {new Date(`${day}T00:00:00`).toLocaleDateString([], {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}

      <div className="slot-legend-row">
        <div className="slot-legend">
          <span><i className="slot-dot slot-dot-free" /> Available</span>
          <span><i className="slot-dot slot-dot-booked" /> Booked</span>
          {!readOnly && <span><i className="slot-dot slot-dot-sel" /> Selected</span>}
        </div>
        {!readOnly && (
          <button
            type="button"
            className="slot-refresh"
            onClick={() => setReload((n) => n + 1)}
            disabled={loading}
            title="Refresh slots for this day"
          >
            <Icon name="refresh" size={16} className={loading ? "spin" : ""} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </div>

      {loading ? (
        <div className={`slot-grid${readOnly ? " readonly" : ""}`} aria-busy="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="slot-skeleton" />
          ))}
        </div>
      ) : loadError && !availabilityOverride ? (
        <div className="slot-error" style={{ margin: "8px 0" }}>
          <p className="muted" style={{ margin: "0 0 8px" }}>
            Couldn't load the clinic hours — the connection may be slow. Please try again.
          </p>
          <button type="button" className="btn-secondary icon" onClick={() => setReload((n) => n + 1)}>
            <Icon name="refresh" size={18} /> Retry
          </button>
        </div>
      ) : !hours ? (
        <p className="muted" style={{ margin: "8px 0" }}>The clinic is closed on this day.</p>
      ) : (
        <div className={`slot-grid${readOnly ? " readonly" : ""}`}>
          {slots.map((slot) => {
            const [h, m] = slot.split(":").map(Number);
            const slotTime = new Date(`${day}T${pad(h)}:${pad(m)}:00`).getTime();
            const booked = bookedSet.has(slot);
            const past = slotTime < now;
            const selected = !readOnly && selectedHM === slot;
            const cls = `slot${selected ? " selected" : ""}${booked ? " booked" : ""}${
              past && !booked ? " past" : ""
            }`;
            const title = booked ? "Booked" : past ? "Past" : "Available";
            if (readOnly) {
              return (
                <div key={slot} className={cls} title={title}>
                  {fmt12(slot)}
                </div>
              );
            }
            return (
              <button
                key={slot}
                type="button"
                className={cls}
                disabled={booked || past}
                title={title}
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
