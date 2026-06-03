import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="icon">
          <Icon name="dentistry" />
          Dental Clinic
        </Link>
      </div>
      <div className="navbar-links">
        {user.role === "dentist" && (
          <>
            <Link to="/dentist" className="icon">
              <Icon name="dashboard" /> Dashboard
            </Link>
            <Link to="/clients" className="icon">
              <Icon name="group" /> Clients
            </Link>
            <Link to="/appointments" className="icon">
              <Icon name="calendar_month" /> Appointments
            </Link>
            <Link to="/treatments" className="icon">
              <Icon name="medical_services" /> Treatments
            </Link>
          </>
        )}
        {user.role === "client" && (
          <>
            <Link to="/client" className="icon">
              <Icon name="dashboard" /> My Dashboard
            </Link>
          </>
        )}
        <span className="user-info icon">
          <Icon name="account_circle" />
          {user.name} ({user.role})
        </span>
        <button className="btn-link icon" onClick={handleLogout}>
          <Icon name="logout" /> Logout
        </button>
      </div>
    </nav>
  );
}
