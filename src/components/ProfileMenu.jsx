import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";

// Account icon (top-right on mobile) with a dropdown showing the user + logout.
export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login");
  };

  const goProfile = () => {
    setOpen(false);
    navigate("/profile");
  };

  return (
    <div className="profile-menu">
      <button
        className="profile-btn"
        aria-label="Account"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="account_circle" />
      </button>
      {open && (
        <>
          <div className="profile-backdrop" onClick={() => setOpen(false)} />
          <div className="profile-dropdown">
            <button className="profile-head profile-head-btn" onClick={goProfile}>
              <div className="profile-name">{user.name}</div>
              <div className="profile-role">{user.role}</div>
            </button>
            <button className="profile-item" onClick={handleLogout}>
              <Icon name="logout" size={20} /> Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
