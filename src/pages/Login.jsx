import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^\+?[0-9][0-9\s-]{6,14}$/;

  const validate = () => {
    const e = {};
    const id = form.identifier.trim();
    if (!id) e.identifier = "Email or phone is required.";
    else if (!EMAIL_RE.test(id) && !PHONE_RE.test(id))
      e.identifier = "Enter a valid email or phone number.";
    if (!form.password) e.password = "Password is required.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setLoading(true);
    try {
      const user = await login(form.identifier, form.password);
      navigate(
        user.role === "dentist"
          ? "/dentist"
          : user.role === "vendor"
          ? "/vendor"
          : "/client"
      );
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <div className="auth-brand">
          <img src="/favicon.svg" alt="MyDentalBooking" className="auth-logo" />
          <div>
            <div className="auth-title">MyDentalBooking</div>
            <div className="auth-subtitle">Sign in to your account</div>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <label>
          Email or phone
          <div className="input-wrap has-leading">
            <Icon name="alternate_email" size={20} className="field-leading" />
            <input
              type="text"
              name="identifier"
              placeholder="you@example.com or 03001234567"
              className={errors.identifier ? "invalid" : ""}
              value={form.identifier}
              onChange={handleChange}
            />
          </div>
          {errors.identifier && <span className="field-error">{errors.identifier}</span>}
        </label>
        <label>
          Password
          <PasswordInput
            name="password"
            autoComplete="current-password"
            leadingIcon="lock"
            invalid={!!errors.password}
            value={form.password}
            onChange={handleChange}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>
        <div style={{ textAlign: "right", marginTop: -6 }}>
          <Link to="/forgot-password" className="muted" style={{ fontSize: 13 }}>
            Forgot password?
          </Link>
        </div>
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
