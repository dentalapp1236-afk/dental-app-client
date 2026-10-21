import Icon from "./Icon";

// Full-screen "can't reach the server" state with a Retry button — shown in
// place of an endless loader when the startup session check fails.
export default function ConnectionError({ onRetry }) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <div className="fullscreen-loader" role="alert">
      <div className="fsl-inner conn-error">
        <Icon name={offline ? "wifi_off" : "cloud_off"} size={44} />
        <div className="fsl-brand">
          <Icon name="dentistry" /> MyDentalBooking
        </div>
        <p className="muted">
          {offline
            ? "You're offline. Check your internet connection and try again."
            : "Can't reach the server right now. Check your internet connection and try again."}
        </p>
        <button type="button" className="icon" onClick={onRetry}>
          <Icon name="refresh" size={18} /> Retry
        </button>
      </div>
    </div>
  );
}
