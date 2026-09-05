import Icon from "./Icon";

// Shown across the top whenever this tab is an admin "View as" (read-only)
// session. Makes the impersonation obvious and offers a one-tap way out.
export default function ImpersonationBanner() {
  const viewAs = localStorage.getItem("viewAs");
  if (viewAs === null) return null;

  const exit = () => {
    localStorage.removeItem("viewAs");
    const adminToken = localStorage.getItem("adminToken");
    if (adminToken) {
      // Restore the admin session and go back to the admin dashboard.
      const adminUser = localStorage.getItem("adminUser");
      localStorage.setItem("token", adminToken);
      if (adminUser) localStorage.setItem("user", adminUser);
      else localStorage.removeItem("user");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      window.location.replace("/admin");
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("/login");
    }
  };

  return (
    <div className="impersonate-banner">
      <span className="row gap icon">
        <Icon name="visibility" size={16} />
        Viewing {viewAs || "clinic"} — read-only
      </span>
      <button type="button" className="impersonate-exit" onClick={exit}>
        Exit view
      </button>
    </div>
  );
}
