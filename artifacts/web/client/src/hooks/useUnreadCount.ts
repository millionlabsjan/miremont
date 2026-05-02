import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "./useAuth";

export function useUnreadCount() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const res = await apiRequest("/api/notifications/unread-count");
      const body = await res.json();
      return (body?.count as number) ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
  return data ?? 0;
}
