import { FilterStateSchema, type FilterState } from "./schema";

/**
 * Typed shape stored in saved_searches.filters jsonb. Uses named fields
 * (location, minPrice, categories, …) so the server-side inverse matcher
 * and notification fan-out can read them directly without re-parsing.
 */
export type TypedSavedFilters = {
  location?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  minPrice?: number;
  maxPrice?: number;
  categories?: string[];
  bedrooms?: number;
  bathrooms?: number;
  features?: string[];
};

/** Convert client FilterState into the typed shape used by saved_searches. */
export function filterStateToTyped(state: FilterState): TypedSavedFilters {
  const out: TypedSavedFilters = {};
  if (state.q) out.location = state.q;
  if (state.lat !== undefined) out.lat = state.lat;
  if (state.lng !== undefined) out.lng = state.lng;
  if (state.radius !== undefined) out.radius = state.radius;
  if (state.min !== undefined) out.minPrice = state.min;
  if (state.max !== undefined) out.maxPrice = state.max;
  if (state.types.length > 0) out.categories = [...state.types];
  if (state.beds !== undefined) out.bedrooms = state.beds;
  if (state.baths !== undefined) out.bathrooms = state.baths;
  if (state.features.length > 0) out.features = [...state.features];
  return out;
}

/** Inverse of filterStateToTyped — for when a saved search row is loaded. */
export function typedSavedToFilterState(typed: any): FilterState {
  const t = (typed ?? {}) as TypedSavedFilters;
  return FilterStateSchema.parse({
    q: t.location ?? undefined,
    lat: t.lat !== undefined ? String(t.lat) : undefined,
    lng: t.lng !== undefined ? String(t.lng) : undefined,
    radius: t.radius !== undefined ? String(t.radius) : undefined,
    min: t.minPrice !== undefined ? String(t.minPrice) : undefined,
    max: t.maxPrice !== undefined ? String(t.maxPrice) : undefined,
    types: Array.isArray(t.categories) ? t.categories.join(",") : undefined,
    beds: t.bedrooms !== undefined ? String(t.bedrooms) : undefined,
    baths: t.bathrooms !== undefined ? String(t.bathrooms) : undefined,
    features: Array.isArray(t.features) ? t.features.join(",") : undefined,
  });
}

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
