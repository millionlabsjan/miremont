// Exchange rate service — fetches from frankfurter.app (ECB rates, free, no API key)
// Caches in memory, refreshes every hour.

type Rates = Record<string, number>;

let cachedRates: Rates = {};
let lastFetch = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Frankfurter returns rates relative to a base currency.
// We store all rates relative to EUR (the ECB base).
async function fetchRates(): Promise<Rates> {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=EUR&to=USD,GBP"
    );
    if (!res.ok) throw new Error(`Frankfurter API ${res.status}`);
    const data = await res.json();
    // data.rates = { USD: 1.08, GBP: 0.86, ... }
    // Add EUR itself as 1
    return { EUR: 1, ...data.rates };
  } catch (err) {
    console.warn("Failed to fetch exchange rates:", err);
    return cachedRates; // return stale rates on failure
  }
}

export async function initRates(): Promise<void> {
  cachedRates = await fetchRates();
  lastFetch = Date.now();
  console.log("Exchange rates loaded:", cachedRates);
}

export async function getRates(): Promise<Rates> {
  if (Date.now() - lastFetch > CACHE_TTL) {
    cachedRates = await fetchRates();
    lastFetch = Date.now();
  }
  return cachedRates;
}

export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Rates
): number {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return amount; // can't convert, return as-is
  // Convert: amount in `from` → EUR → `to`
  return (amount / fromRate) * toRate;
}
