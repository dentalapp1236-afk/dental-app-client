import { useRegisterSW } from "virtual:pwa-register/react";
import Icon from "./Icon";

// Shows a popup when a new build has been deployed. The new service worker
// installs and waits; tapping "Reload" activates it and reloads the page so
// the latest features are live. Dismissing keeps the current version until the
// next check.
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      // Idle/open tabs (e.g. the dentist's laptop) won't notice a new deploy on
      // their own — poll periodically and whenever the tab regains focus so the
      // prompt appears without a manual hard refresh.
      if (!reg) return;
      const check = () => reg.update().catch(() => {});
      setInterval(check, 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="update-toast" role="alert" aria-live="polite">
      <div className="update-toast-msg">
        <Icon name="rocket_launch" size={22} />
        <div>
          <strong>New version available</strong>
          <span>Reload to get the latest features.</span>
        </div>
      </div>
      <div className="update-toast-actions">
        <button type="button" className="btn-secondary" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
        <button type="button" className="icon" onClick={() => updateServiceWorker(true)}>
          <Icon name="refresh" size={18} /> Reload
        </button>
      </div>
    </div>
  );
}
