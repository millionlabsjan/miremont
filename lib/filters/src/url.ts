import type { FilterState } from "./schema";

export type FilterParams = Partial<{
  q: string;
  lat: string;
  lng: string;
  radius: string;
  min: string;
  max: string;
  types: string;
  beds: string;
  baths: string;
  features: string;
  sort: string;
  page: string;
  limit: string;
}>;

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function filtersToParams(state: Partial<FilterState>): FilterParams {
  const out: FilterParams = {};
  if (!isEmpty(state.q)) out.q = state.q!;
  if (state.lat !== undefined) out.lat = String(state.lat);
  if (state.lng !== undefined) out.lng = String(state.lng);
  if (state.radius !== undefined) out.radius = String(state.radius);
  if (state.min !== undefined) out.min = String(state.min);
  if (state.max !== undefined) out.max = String(state.max);
  if (!isEmpty(state.types)) out.types = state.types!.join(",");
  if (state.beds !== undefined) out.beds = String(state.beds);
  if (state.baths !== undefined) out.baths = String(state.baths);
  if (!isEmpty(state.features)) out.features = state.features!.join(",");
  if (state.sort && state.sort !== "newest") out.sort = state.sort;
  if (state.page && state.page > 1) out.page = String(state.page);
  if (state.limit && state.limit !== 20) out.limit = String(state.limit);
  return out;
}

export function filtersToSearchParams(
  state: Partial<FilterState>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filtersToParams(state))) {
    if (v !== undefined) params.set(k, v);
  }
  return params;
}

export function filtersToQueryString(state: Partial<FilterState>): string {
  const params = filtersToSearchParams(state);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function paramsRecordToObject(
  source: URLSearchParams | Record<string, string | string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  if (source instanceof URLSearchParams) {
    source.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined) continue;
    out[k] = Array.isArray(v) ? (v[0] ?? "") : v;
  }
  return out;
}
