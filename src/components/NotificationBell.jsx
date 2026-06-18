import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";
import Icon from "./Icon";

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// Where each notification should take the user
const routeFor = (n) => {
  switch (n.type) {
    case "association_request":
    case "association_ended":
      return "/clients";
    case "association_approved":
      return "/client";
    case "association_rejected":
      return "/find-dentist";
    default:
      return n.data?.url || "/";
  }
};

export default function NotificationBell() {
  const { items, unreadCount, markAllRead, enabled, setEnabled } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) markAllRead();
  };

  const openItem = (n) => {
    setOpen(false);
    navigate(routeFor(n));
  };

  return (
    <div className="bell">
      <button className="bell-btn" aria-label="Notifications" onClick={toggle}>
        <Icon name="notifications" />
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>
      {open && (
        <>
          <div className="profile-backdrop" onClick={() => setOpen(false)} />
          <div className="bell-dropdown">
            <div className="bell-head">
              <span>Notifications</span>
              <button
                className="bell-toggle"
                onClick={() => setEnabled(!enabled)}
                aria-pressed={enabled}
                title={enabled ? "Turn notifications off" : "Turn notifications on"}
              >
                <Icon name={enabled ? "notifications_active" : "notifications_off"} size={18} />
                {enabled ? "On" : "Off"}
              </button>
            </div>
            {items.length === 0 ? (
              <div className="bell-empty">No notifications yet.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  className={`bell-item ${n.read ? "" : "unread"}`}
                  onClick={() => openItem(n)}
                >
                  <div className="bell-title">{n.title}</div>
                  {n.body && <div className="bell-body">{n.body}</div>}
                  <div className="bell-time">{timeAgo(n.createdAt)}</div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
