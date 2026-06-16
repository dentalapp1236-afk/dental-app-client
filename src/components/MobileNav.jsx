import { NavLink } from "react-router-dom";
import { ROLE_LINKS } from "../navLinks";
import Icon from "./Icon";

// Bottom tab bar shown on mobile to switch between sections.
export default function MobileNav({ role }) {
  const links = ROLE_LINKS[role] || [];
  return (
    <nav className="mobile-nav">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} className="mobile-nav-item">
          <Icon name={l.icon} />
          <span>{l.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
