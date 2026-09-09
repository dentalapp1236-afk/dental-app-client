import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const ClinicContext = createContext(null);

// Tracks an assistant's clinics: their active engagements (for the switcher) and
// pending invites. The selected clinic id lives in localStorage ("activeClinic")
// so the axios interceptor can send it as X-Clinic-Id on every request.
export const ClinicProvider = ({ children }) => {
  const { user } = useAuth();
  const isAssistant = user?.role === "assistant";
  const [active, setActive] = useState([]);
  const [pending, setPending] = useState([]);
  const [activeClinic, setActiveClinicState] = useState(() => localStorage.getItem("activeClinic") || null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAssistant) {
      setActive([]);
      setPending([]);
      setLoaded(true);
      return;
    }
    try {
      const { data } = await api.get("/engagements/me", { skipLoader: true });
      const act = data.active || [];
      setActive(act);
      setPending(data.pending || []);
      // Keep the selected clinic valid; default to the first active one.
      const ids = act.map((e) => e.dentist?._id).filter(Boolean);
      let cur = localStorage.getItem("activeClinic");
      if (!cur || !ids.includes(cur)) {
        cur = ids[0] || null;
        if (cur) localStorage.setItem("activeClinic", cur);
        else localStorage.removeItem("activeClinic");
        setActiveClinicState(cur);
      }
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, [isAssistant]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Switch clinic -> persist and reload so all data refetches scoped to it.
  const switchClinic = (dentistId) => {
    if (!dentistId || dentistId === activeClinic) return;
    localStorage.setItem("activeClinic", dentistId);
    window.location.assign("/dentist");
  };

  return (
    <ClinicContext.Provider
      value={{ isAssistant, active, pending, activeClinic, loaded, refresh, switchClinic }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => useContext(ClinicContext) || {
  isAssistant: false, active: [], pending: [], activeClinic: null, loaded: true,
  refresh: () => {}, switchClinic: () => {},
};
