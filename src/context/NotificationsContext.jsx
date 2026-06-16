import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";
import { subscribeToPush } from "../push";

const NotificationsContext = createContext(null);

// Short alert beep using the Web Audio API (no asset needed)
function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
    osc.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}

function buzz() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* ignore */
  }
}

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnread = useRef(0);
  const firstLoad = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", { skipLoader: true });
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      // Alert (vibrate + beep) only when a NEW unread arrives after the first load
      if (!firstLoad.current && data.unreadCount > prevUnread.current) {
        buzz();
        playBeep();
      }
      prevUnread.current = data.unreadCount;
      firstLoad.current = false;
    } catch {
      /* ignore poll errors */
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      prevUnread.current = 0;
      firstLoad.current = true;
      return;
    }
    refresh();
    subscribeToPush(); // register background push (best-effort)
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [user, refresh]);

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all", null, { skipLoader: true });
    } catch {
      /* ignore */
    }
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
    prevUnread.current = 0;
  };

  return (
    <NotificationsContext.Provider value={{ items, unreadCount, refresh, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
