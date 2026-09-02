import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_LINKS, decorateClientLinks } from "../navLinks";
import Icon from "./Icon";
import { trackTabViewed } from "../utils/analytics";

export default function Sidebar({ open, onNavigate, myDentistId, badges }) {
  const { user } = useAuth();
  if (!user) return null;

  const links = decorateClientLinks(ROLE_LINKS[user.role] || [], myDentistId);

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-brand">
        <Link to="/" className="icon" onClick={onNavigate}>
          <Icon name="dentistry" />
          <span>MyDentalBooking</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {links.map((l) => {
          const count = badges?.[l.to];
          return (
            <NavLink
              key={l.to}
              to={l.to}
              end={links.some((o) => o.to !== l.to && o.to.startsWith(`${l.to}/`))}
              className="sidebar-link"
              onClick={() => {
                trackTabViewed(l.label, l.to);
                onNavigate?.();
              }}
            >
              <span className="nav-icon-wrap">
                <Icon name={l.icon} />
                {!!count && <span className="nav-badge">{count > 9 ? "9+" : count}</span>}
              </span>
              <span>{l.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
