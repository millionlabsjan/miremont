import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./api";
import { useAuthStore } from "./auth";

export function useUnreadCount() {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const res = await apiRequest("/api/notifications/unread-count");
      return (res?.count as number) ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
  return data ?? 0;
}
