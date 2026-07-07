import { createContext, useContext, useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../components/Icon";

// Global toast/popup notifications. Fixed to the top of the viewport (above
// modals, via a portal) so messages are visible without scrolling. Auto-dismiss,
// tap or ✕ to close, and multiple toasts stack.
const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const DURATIONS = { error: 6000, success: 4000, info: 5000 };
const ICONS = { error: "error", success: "check_circle", info: "info" };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (type, message) => {
      const text = typeof message === "string" ? message.trim() : "";
      if (!text) return;
      const id = ++idRef.current;
      setToasts((list) => {
        // Don't stack an identical message that's already showing.
        if (list.some((t) => t.message === text && t.type === type)) return list;
        return [...list, { id, type, message: text }];
      });
      timers.current[id] = setTimeout(() => dismiss(id), DURATIONS[type] || 5000);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      error: (m) => push("error", m),
      success: (m) => push("success", m),
      info: (m) => push("info", m),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="toast-viewport" aria-live="assertive" aria-atomic="false">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast toast-${t.type}`}
              role="alert"
              onClick={() => dismiss(t.id)}
            >
              <Icon name={ICONS[t.type] || "info"} size={20} className="toast-icon" />
              <span className="toast-msg">{t.message}</span>
              <button
                type="button"
                className="toast-close"
                aria-label="Dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
