import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { notificationRoute } from "../lib/notificationRoute";

interface NotificationItem {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["notifications-recent"],
    queryFn: async () => {
      const res = await apiRequest("/api/notifications?limit=10");
      return (await res.json()) as { notifications: NotificationItem[]; unread: number };
    },
    enabled: open,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  const markRead = async (id: string) => {
    await apiRequest(`/api/notifications/${id}/read`, { method: "PUT" });
    queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
  };

  const markAllRead = async () => {
    await apiRequest("/api/notifications/read-all", { method: "PUT" });
    queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
  };

  if (!open) return null;
  const items = data?.notifications ?? [];

  return (
    <div
      ref={ref}
      className="absolute left-full top-0 ml-2 w-[360px] max-h-[520px] bg-brand-offwhite text-brand-dark rounded-xl shadow-2xl border border-brand-border z-[100] flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
        <h3 className="font-serif text-base font-semibold">Notifications</h3>
        {items.some((n) => !n.isRead) && (
          <button
            onClick={markAllRead}
            className="text-xs text-brand-warm hover:text-brand-dark transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1">
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-brand-warm">No notifications yet</div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (!n.isRead) void markRead(n.id);
                const route = notificationRoute(n.link);
                if (route) {
                  onClose();
                  navigate(route);
                }
              }}
              className="w-full text-left px-4 py-3 flex gap-3 hover:bg-white/60 transition-colors border-b border-brand-border/50 last:border-b-0"
            >
              <span
                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                  n.isRead ? "bg-brand-warm" : "bg-brand-accent"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.isRead ? "font-normal" : "font-semibold"} text-brand-dark`}>
                  {n.title}
                </p>
                {n.body && <p className="text-xs text-brand-warm mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-brand-warm mt-1">{timeAgo(n.createdAt)}</p>
              </div>
            </button>
          ))
        )}
      </div>
      <Link
        to="/account/notifications"
        onClick={onClose}
        className="px-4 py-3 text-center text-sm font-medium text-brand-dark border-t border-brand-border hover:bg-white/60 transition-colors"
      >
        See all notifications
      </Link>
    </div>
  );
}
