import { useState } from "react";
import { Link } from "react-router-dom";
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

interface ListResponse {
  notifications: NotificationItem[];
  total: number;
  unread: number;
  page: number;
}

const PAGE_SIZE = 25;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function InboxPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-inbox", page],
    queryFn: async () => {
      const res = await apiRequest(`/api/notifications?page=${page}&limit=${PAGE_SIZE}`);
      return (await res.json()) as ListResponse;
    },
  });

  const markRead = async (id: string) => {
    await apiRequest(`/api/notifications/${id}/read`, { method: "PUT" });
    queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
  };

  const markAllRead = async () => {
    await apiRequest("/api/notifications/read-all", { method: "PUT" });
    queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
  };

  const items = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-dark">Notifications</h1>
          <p className="text-sm text-brand-warm mt-1">
            {data ? `${data.unread} unread of ${total}` : "Loading…"}
          </p>
        </div>
        {data && data.unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-medium text-brand-dark hover:text-brand-accent transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="bg-white border border-brand-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-brand-warm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-brand-warm">No notifications yet</div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className="flex gap-3 px-5 py-4 border-b border-brand-border/50 last:border-b-0 hover:bg-brand-offwhite/40 transition-colors"
            >
              <span
                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                  n.isRead ? "bg-brand-warm" : "bg-brand-accent"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`text-sm ${n.isRead ? "font-normal" : "font-semibold"} text-brand-dark`}>
                    {n.title}
                  </p>
                  <span className="text-xs text-brand-warm shrink-0">{formatDate(n.createdAt)}</span>
                </div>
                {n.body && <p className="text-sm text-brand-warm mt-1">{n.body}</p>}
                <div className="flex gap-3 mt-2">
                  {notificationRoute(n.link) && (
                    <Link
                      to={notificationRoute(n.link)!}
                      onClick={() => !n.isRead && markRead(n.id)}
                      className="text-xs font-medium text-brand-dark hover:text-brand-accent"
                    >
                      View →
                    </Link>
                  )}
                  {!n.isRead && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-xs text-brand-warm hover:text-brand-dark"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-sm text-brand-dark disabled:text-brand-warm disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-brand-warm">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm text-brand-dark disabled:text-brand-warm disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
