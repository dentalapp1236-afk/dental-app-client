import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_LINKS } from "../navLinks";
import NotificationBell from "./NotificationBell";
import Icon from "./Icon";

export default function Sidebar({ open, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const links = ROLE_LINKS[user.role] || [];

  const handleLogout = () => {
    onNavigate?.();
    logout();
    navigate("/login");
  };

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-brand">
        <Link to="/" className="icon" onClick={onNavigate}>
          <Icon name="dentistry" />
          <span>MyDentalBooking</span>
        </Link>
        <NotificationBell />
      </div>

      <nav className="sidebar-nav">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className="sidebar-link" onClick={onNavigate}>
            <Icon name={l.icon} />
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <Icon name="account_circle" />
          <div>
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">{user.role}</div>
          </div>
        </div>
        <button className="sidebar-link logout" onClick={handleLogout}>
          <Icon name="logout" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
