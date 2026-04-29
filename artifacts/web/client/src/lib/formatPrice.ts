type Rates = Record<string, number>;

const SYMBOLS: Record<string, string> = {
  EUR: "\u20AC",
  USD: "$",
  GBP: "\u00A3",
};

function getSymbol(currency: string): string {
  return SYMBOLS[currency] || currency;
}

function convert(
  amount: number,
  from: string,
  to: string,
  rates: Rates
): number {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
}

export function formatPrice(
  price: string | number,
  listingCurrency: string | undefined | null,
  userCurrency?: string | null,
  rates?: Rates | null
): string {
  const num = Number(price);
  const from = listingCurrency || "EUR";
  const to = userCurrency || from;
  const converted = rates ? convert(num, from, to, rates) : num;
  const display = rates ? to : from;
  return `${getSymbol(display)} ${Math.round(converted).toLocaleString()}`;
}

export function formatPriceCompact(
  price: string | number,
  listingCurrency: string | undefined | null,
  userCurrency?: string | null,
  rates?: Rates | null
): string {
  const num = Number(price);
  const from = listingCurrency || "EUR";
  const to = userCurrency || from;
  const converted = rates ? convert(num, from, to, rates) : num;
  const display = rates ? to : from;
  const sym = getSymbol(display);

  if (converted >= 1_000_000) {
    return `${sym} ${(converted / 1_000_000).toFixed(1)}M`;
  }
  if (converted >= 1_000) {
    return `${sym} ${Math.round(converted / 1_000)}K`;
  }
  return `${sym} ${Math.round(converted).toLocaleString()}`;
}
