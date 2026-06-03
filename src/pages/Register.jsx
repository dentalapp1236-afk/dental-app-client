import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "client",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register(form);
      navigate(user.role === "dentist" ? "/dentist" : "/client");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <h2 className="icon"><Icon name="person_add" /> Create account</h2>
        {error && <div className="error">{error}</div>}
        <label>
          I am a
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="client">Client</option>
            <option value="dentist">Dentist</option>
          </select>
        </label>
        <label>
          Full name
          <input name="name" required value={form.name} onChange={handleChange} />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
          />
        </label>
        <label>
          Phone
          <input name="phone" value={form.phone} onChange={handleChange} />
        </label>
        <label>
          Password (min 8 chars)
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
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
