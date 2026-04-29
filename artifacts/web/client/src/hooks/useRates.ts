import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

type Rates = Record<string, number>;

export function useRates(): Rates | null {
  const { data } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const res = await apiRequest("/api/properties/rates");
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });
  return data?.rates ?? null;
}
