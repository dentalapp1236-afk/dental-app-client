import { useState } from "react";
import { useNotifications } from "../context/NotificationsContext";
import Icon from "./Icon";

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function NotificationBell() {
  const { items, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) markAllRead();
  };

  return (
    <div className="bell">
      <button className="bell-btn" aria-label="Notifications" onClick={toggle}>
        <Icon name="notifications" />
        {unreadCount > 0 && <span className="bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <>
          <div className="profile-backdrop" onClick={() => setOpen(false)} />
          <div className="bell-dropdown">
            <div className="bell-head">Notifications</div>
            {items.length === 0 ? (
              <div className="bell-empty">No notifications yet.</div>
            ) : (
              items.map((n) => (
                <div key={n._id} className={`bell-item ${n.read ? "" : "unread"}`}>
                  <div className="bell-title">{n.title}</div>
                  {n.body && <div className="bell-body">{n.body}</div>}
                  <div className="bell-time">{timeAgo(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
