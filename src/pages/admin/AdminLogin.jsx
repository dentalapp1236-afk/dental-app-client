import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

// Admin sign-in at /admin. Same credentials/endpoint as everyone else, but only
// an admin account is allowed through here.
export default function AdminLogin() {
  const { login, logout } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(identifier, password);
      if (u.role !== "admin") {
        logout();
        setError("This account is not an administrator.");
      }
      // If admin, AdminApp re-renders into the dashboard automatically.
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-ui">
      <div className="auth-wrap">
        <form className="card auth-card" onSubmit={submit}>
          <h1>MyDentalBooking</h1>
          <p className="muted">Admin panel</p>
          {error && <div className="error">{error}</div>}
          <label>
            Email or phone
            <input
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}
