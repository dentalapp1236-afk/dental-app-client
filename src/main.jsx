import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { NotificationsProvider } from "./context/NotificationsContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Keep already-open tabs current with new deploys. The service worker auto-updates
// and reloads the page once a new build's worker activates — but an idle, open tab
// only looks for a new build when something triggers a check. Poll periodically and
// whenever the tab regains focus, so the dentist's laptop picks up new versions on
// its own instead of needing a manual hard refresh.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    const check = () => reg.update().catch(() => {});
    setInterval(check, 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
  });
}
