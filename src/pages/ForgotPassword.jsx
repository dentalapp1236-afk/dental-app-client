import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Icon from "../components/Icon";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setFieldError("Email is required.");
    if (!EMAIL_RE.test(email.trim())) return setFieldError("Enter a valid email address.");
    setFieldError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="card">
        <h2 className="icon">
          <Icon name="lock_reset" /> Reset password
        </h2>

        {sent ? (
          <>
            <p>
              If an account exists for <strong>{email}</strong>, we’ve sent a password reset
              link. It’s valid for 1 hour — check your inbox (and spam folder).
            </p>
            <Link to="/login" className="icon">
              <Icon name="arrow_back" size={18} /> Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate style={{ display: "contents" }}>
            <p className="muted" style={{ margin: 0 }}>
              Enter your account email and we’ll send you a link to reset your password.
            </p>
            {error && <div className="error">{error}</div>}
            <label>
              <span className="lbl">Email <span className="req">*</span></span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className={fieldError ? "invalid" : ""}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError("");
                }}
              />
              {fieldError && <span className="field-error">{fieldError}</span>}
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <p className="muted">
              Remembered it? <Link to="/login">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
