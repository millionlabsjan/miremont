import { useState } from "react";
import { Bell } from "lucide-react";
import { useUnreadCount } from "../hooks/useUnreadCount";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
        className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-brand-offwhite"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-accent text-[10px] font-semibold text-white flex items-center justify-center border-2 border-brand-dark">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <NotificationDropdown open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
