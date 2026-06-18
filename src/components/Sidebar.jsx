import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_LINKS } from "../navLinks";
import Icon from "./Icon";

export default function Sidebar({ open, onNavigate }) {
  const { user } = useAuth();
  if (!user) return null;

  const links = ROLE_LINKS[user.role] || [];

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-brand">
        <Link to="/" className="icon" onClick={onNavigate}>
          <Icon name="dentistry" />
          <span>MyDentalBooking</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className="sidebar-link" onClick={onNavigate}>
            <Icon name={l.icon} />
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
