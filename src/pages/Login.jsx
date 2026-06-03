import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.identifier, form.password);
      navigate(user.role === "dentist" ? "/dentist" : "/client");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <h2 className="icon"><Icon name="login" /> Sign in</h2>
        {error && <div className="error">{error}</div>}
        <label>
          Email or phone
          <input
            type="text"
            name="identifier"
            required
            placeholder="you@example.com or 03001234567"
            value={form.identifier}
            onChange={handleChange}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted">
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
