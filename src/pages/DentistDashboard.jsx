import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { formatDate, formatDateTime } from "../utils/date";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import Icon from "../components/Icon";
import { SkeletonTable } from "../components/Skeleton";

const pad = (n) => String(n).padStart(2, "0");
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const JS_DAY_TO_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STEP = 15;

const fmt12 = (s) => {
  const [h, m] = s.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
};
const toMin = (s) => {
  const [h, m] = String(s).split(":").map(Number);
  return h * 60 + (m || 0);
};
const buildSlots = (startMin, endMin, step) => {
  const out = [];
  for (let t = startMin; t < endMin; t += step) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  return out;
};
const statusLabel = (s) => (s === "no_show" ? "No-show" : s);

const STATUS_ACTIONS = [
  { value: "completed", label: "Mark done", icon: "task_alt" },
  { value: "cancelled", label: "Cancel", icon: "cancel" },
  { value: "no_show", label: "No-show", icon: "person_off" },
  { value: "scheduled", label: "Reopen", icon: "event_repeat" },
];

export default function DentistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appts, setAppts] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const { items } = useNotifications();
  const today = useMemo(() => dayStr(new Date()), []);

  const load = useCallback(async () => {
    const from = new Date(`${today}T00:00:00`);
    const to = new Date(`${today}T00:00:00`);
    to.setDate(to.getDate() + 1);
    const [all, booked] = await Promise.all([
      api.get("/appointments", { skipLoader: true }),
      api.get("/appointments/booked", {
        params: { from: from.toISOString(), to: to.toISOString() },
        skipLoader: true,
      }),
    ]);
    setAppts(all.data);
    setAvailability(booked.data.availability || []);
  }, [today]);

  useEffect(() => {
    load()
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [load]);

  // Refresh when the tab regains focus (assistant/dentist may have changed things)
  useEffect(() => {
    const onFocus = () => load().catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // Live updates: refetch when a notification arrives (e.g. a patient marks
  // "on the way" / "arrived"), and poll every 15s as a fallback so the board
  // stays current even while the dentist is watching it.
  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => {
    const id = setInterval(() => load().catch(() => {}), 9000);
    return () => clearInterval(id);
  }, [load]);

  // Today's appointments, keyed by their slot start time (HH:mm)
  const apptByTime = useMemo(() => {
    const map = {};
    for (const a of appts) {
      const d = new Date(a.date);
      if (dayStr(d) !== today) continue;
      if (a.status === "cancelled") continue; // a cancelled slot is free again
      map[hm(d)] = a; // last write wins; appointments are unique per slot
    }
    return map;
  }, [appts, today]);

  // Clinic hours for today (or null if closed)
  const hours = useMemo(() => {
    const label = JS_DAY_TO_LABEL[new Date(`${today}T00:00:00`).getDay()];
    const entry = availability.find((a) => a.day === label);
    if (entry?.start && entry?.end) return { start: toMin(entry.start), end: toMin(entry.end) };
    if (availability.length === 0) return { start: 9 * 60, end: 18 * 60 };
    return null;
  }, [availability, today]);

  const slots = useMemo(
    () => (hours ? buildSlots(hours.start, hours.end, STEP) : []),
    [hours]
  );

  const updateStatus = async (status) => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data } = await api.put(`/appointments/${selected._id}`, {
        status,
        version: selected.__v,
      });
      setSelected(data);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not update status.");
      if (err.response?.status === 409) {
        await load();
        setSelected(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const respondPending = async (action) => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/appointments/${selected._id}/${action}`);
      setSelected(data);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not update the request.");
      await load();
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  const greeting = `Welcome, ${user.role === "dentist" ? "Dr. " : ""}${user.name}`;

  if (loading)
    return (
      <div className="page">
        <h1 className="icon"><Icon name="waving_hand" /> {greeting}</h1>
        <h2 className="icon"><Icon name="today" /> Today's schedule</h2>
        <SkeletonTable rows={4} cols={3} />
      </div>
    );

  const bookedCount = slots.filter((s) => apptByTime[s]).length;

  return (
    <div className="page">
      <h1 className="icon"><Icon name="waving_hand" /> {greeting}</h1>

      <div className="row gap" style={{ justifyContent: "space-between", flexWrap: "wrap", alignItems: "baseline" }}>
        <h2 className="icon" style={{ margin: 0 }}><Icon name="today" /> Today's schedule</h2>
        <span className="muted">{formatDate(new Date())} · {bookedCount} booked</span>
      </div>

      {!hours ? (
        <p className="muted">The clinic is closed today.</p>
      ) : (
        <div className="day-grid">
          {slots.map((slot) => {
            const appt = apptByTime[slot];
            if (!appt) {
              return (
                <div key={slot} className="day-slot available" title="Available">
                  <span className="slot-time">{fmt12(slot)}</span>
                  <span>Available</span>
                </div>
              );
            }
            return (
              <div
                key={slot}
                className="day-slot booked"
                onClick={() => setSelected(appt)}
                title="View details"
              >
                <span className="slot-time">{fmt12(slot)}</span>
                <span className="slot-patient">{appt.client?.name || "—"}</span>
                <div className="row gap" style={{ flexWrap: "wrap" }}>
                  <span className={`st st-${appt.status}`}>{statusLabel(appt.status)}</span>
                  {appt.arrivalStatus && appt.arrivalStatus !== "none" && (
                    <span className={`clinic-badge ${appt.arrivalStatus === "arrived" ? "open" : "soon"}`}>
                      <Icon name={appt.arrivalStatus === "arrived" ? "where_to_vote" : "directions_car"} size={14} />
                      {appt.arrivalStatus === "arrived" ? "Arrived" : "On the way"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="icon"><Icon name="event" size={18} /> Appointment details</h3>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setSelected(null)}>
                <Icon name="close" />
              </button>
            </div>
            <div className="detail-list">
              <div className="detail-row">
                <Icon name="schedule" size={18} />
                <span>{formatDateTime(selected.date)}</span>
              </div>
              <div className="detail-row">
                <Icon name="person" size={18} />
                <span>{selected.client?.name || "—"}</span>
              </div>
              {selected.client?.phone && (
                <div className="detail-row">
                  <Icon name="call" size={18} />
                  <span>{selected.client.phone}</span>
                </div>
              )}
              {selected.client?.email && (
                <div className="detail-row">
                  <Icon name="mail" size={18} />
                  <span>{selected.client.email}</span>
                </div>
              )}
              <div className="detail-row">
                <Icon name="medical_services" size={18} />
                <span>{selected.reason || "No purpose given"}</span>
              </div>
              <div className="detail-row">
                <Icon name="info" size={18} />
                <span className={`st st-${selected.status}`}>{statusLabel(selected.status)}</span>
              </div>
              {selected.arrivalStatus && selected.arrivalStatus !== "none" && (
                <div className="detail-row">
                  <Icon name={selected.arrivalStatus === "arrived" ? "where_to_vote" : "directions_car"} size={18} />
                  <span className={`clinic-badge ${selected.arrivalStatus === "arrived" ? "open" : "soon"}`}>
                    {selected.arrivalStatus === "arrived" ? "Patient has arrived" : "Patient is on the way"}
                  </span>
                </div>
              )}
            </div>

            {selected.status === "pending" ? (
              <>
                <div className="lbl" style={{ marginTop: 4 }}>This is a patient request</div>
                <div className="row gap" style={{ flexWrap: "wrap" }}>
                  <button type="button" className="icon" disabled={busy} onClick={() => respondPending("confirm")}>
                    <Icon name="check_circle" size={18} /> Confirm
                  </button>
                  <button type="button" className="btn-danger-soft icon" disabled={busy} onClick={() => respondPending("decline")}>
                    <Icon name="cancel" size={18} /> Decline
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="lbl" style={{ marginTop: 4 }}>Update status</div>
                <div className="row gap" style={{ flexWrap: "wrap" }}>
                  {STATUS_ACTIONS.filter((a) => a.value !== selected.status).map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      className="btn-secondary icon"
                      disabled={busy}
                      onClick={() => updateStatus(a.value)}
                    >
                      <Icon name={a.icon} size={18} /> {a.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="row gap" style={{ marginTop: 4 }}>
              {selected.client?._id && (
                <button className="icon" onClick={() => navigate(`/clients/${selected.client._id}`)}>
                  <Icon name="history" size={18} /> View patient record
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
