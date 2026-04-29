import { useState, useEffect } from "react";
import { API_URL } from "../constants/theme";
import { useAuthStore } from "./auth";

type Rates = Record<string, number>;

let cachedRates: Rates | null = null;
let lastFetch = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function useRates() {
  const [rates, setRates] = useState<Rates | null>(cachedRates);

  useEffect(() => {
    if (cachedRates && Date.now() - lastFetch < CACHE_TTL) {
      setRates(cachedRates);
      return;
    }

    const { sessionCookie } = useAuthStore.getState();
    const headers: Record<string, string> = {};
    if (sessionCookie) headers["x-session-cookie"] = sessionCookie;

    fetch(`${API_URL}/api/properties/rates`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.rates) {
          cachedRates = data.rates;
          lastFetch = Date.now();
          setRates(data.rates);
        }
      })
      .catch(() => {});
  }, []);

  return rates;
}
