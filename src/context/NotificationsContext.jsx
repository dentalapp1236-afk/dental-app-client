import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";
import { subscribeToPush, unsubscribeFromPush } from "../push";

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
  const [enabled, setEnabledState] = useState(
    () => localStorage.getItem("notifEnabled") !== "false"
  );
  const prevUnread = useRef(0);
  const firstLoad = useRef(true);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", { skipLoader: true });
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      // Alert (vibrate + beep) only when enabled AND a new unread arrives after first load
      if (enabledRef.current && !firstLoad.current && data.unreadCount > prevUnread.current) {
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
    if (enabled) subscribeToPush(); // register background push (best-effort)
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refresh]);

  // Turn notifications on/off: controls alerts (sound/vibration) and background push
  const setEnabled = (value) => {
    setEnabledState(value);
    localStorage.setItem("notifEnabled", value ? "true" : "false");
    if (value) subscribeToPush();
    else unsubscribeFromPush();
  };

  const markAllRead = async () => {
    // Update the UI immediately so the bell badge clears instantly…
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
    prevUnread.current = 0;
    // …then persist (the next poll will reconcile if this fails).
    try {
      await api.post("/notifications/read-all", null, { skipLoader: true });
    } catch {
      /* ignore */
    }
  };

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`, null, { skipLoader: true });
    } catch {
      /* ignore */
    }
    setItems((prev) => {
      const next = prev.map((i) => (i._id === id ? { ...i, read: true } : i));
      const unread = next.filter((i) => !i.read).length;
      setUnreadCount(unread);
      prevUnread.current = unread;
      return next;
    });
  };

  const markUnread = async (id) => {
    try {
      await api.post(`/notifications/${id}/unread`, null, { skipLoader: true });
    } catch {
      /* ignore */
    }
    setItems((prev) => {
      const next = prev.map((i) => (i._id === id ? { ...i, read: false } : i));
      const unread = next.filter((i) => !i.read).length;
      setUnreadCount(unread);
      prevUnread.current = unread;
      return next;
    });
  };

  const dismiss = async (id) => {
    try {
      await api.delete(`/notifications/${id}`, { skipLoader: true });
    } catch {
      /* ignore */
    }
    setItems((prev) => {
      const next = prev.filter((i) => i._id !== id);
      const unread = next.filter((i) => !i.read).length;
      setUnreadCount(unread);
      prevUnread.current = unread;
      return next;
    });
  };

  const clearAll = async () => {
    try {
      await api.delete("/notifications", { skipLoader: true });
    } catch {
      /* ignore */
    }
    setItems([]);
    setUnreadCount(0);
    prevUnread.current = 0;
  };

  return (
    <NotificationsContext.Provider
      value={{ items, unreadCount, refresh, markAllRead, markRead, markUnread, dismiss, clearAll, enabled, setEnabled }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
