import { NavLink } from "react-router-dom";
import { ROLE_LINKS, decorateClientLinks } from "../navLinks";
import Icon from "./Icon";

// Bottom tab bar shown on mobile to switch between sections.
export default function MobileNav({ role, myDentistId }) {
  const links = decorateClientLinks(ROLE_LINKS[role] || [], myDentistId);
  return (
    <nav className="mobile-nav">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={links.some((o) => o.to !== l.to && o.to.startsWith(`${l.to}/`))}
          className="mobile-nav-item"
        >
          <Icon name={l.icon} />
          <span>{l.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
