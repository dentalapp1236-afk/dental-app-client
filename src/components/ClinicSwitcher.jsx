import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClinic } from "../context/ClinicContext";
import Icon from "./Icon";

// Top-bar control (assistants only) to switch between the clinics they work for,
// and reach their pending invites. One login, instant switch — no logout.
export default function ClinicSwitcher() {
  const { isAssistant, active, pending, activeClinic, switchClinic } = useClinic();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!isAssistant) return null;

  const current = active.find((e) => e.dentist?._id === activeClinic);
  const label = current?.dentist?.clinicName || current?.dentist?.name || (active.length ? "Select clinic" : "No clinic");

  return (
    <div className="clinic-switcher">
      <button type="button" className="clinic-switcher-btn" onClick={() => setOpen((o) => !o)}>
        <Icon name="apartment" size={18} />
        <span className="clinic-name">{label}</span>
        <Icon name="expand_more" size={18} />
        {pending.length > 0 && <span className="clinic-badge">{pending.length}</span>}
      </button>
      {open && (
        <>
          <div className="cs-backdrop" onClick={() => setOpen(false)} />
          <div className="clinic-menu">
            <div className="clinic-menu-head">Your clinics</div>
            {active.length === 0 && <div className="clinic-menu-empty">You're not on any clinic yet.</div>}
            {active.map((e) => {
              const on = e.dentist?._id === activeClinic;
              return (
                <button
                  key={e._id}
                  type="button"
                  className={`clinic-menu-item${on ? " on" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    switchClinic(e.dentist?._id);
                  }}
                >
                  <Icon name={on ? "check_circle" : "apartment"} size={16} />
                  <span>{e.dentist?.clinicName || e.dentist?.name}</span>
                </button>
              );
            })}
            <div className="clinic-menu-sep" />
            <button
              type="button"
              className="clinic-menu-item"
              onClick={() => {
                setOpen(false);
                navigate("/invites");
              }}
            >
              <Icon name="mail" size={16} />
              <span>Invites</span>
              {pending.length > 0 && <span className="clinic-badge sm">{pending.length}</span>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
