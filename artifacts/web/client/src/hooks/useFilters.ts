import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FilterStateSchema,
  filtersToParams,
  type FilterState,
} from "@workspace/filters";
import { useFilterStore } from "../stores/filterStore";

export type FilterPatch = Partial<FilterState>;

/**
 * Filter state lives in a Zustand store (source of truth) and is mirrored
 * to the URL one-way. URL is authoritative on cold load only — store wins
 * after that, so saved-search loads etc. apply atomically with no router
 * timing risk.
 */
export function useFilters() {
  const filters = useFilterStore((s) => s.filters);
  const setFiltersInStore = useFilterStore((s) => s.setFilters);
  const replaceFiltersInStore = useFilterStore((s) => s.replaceFilters);
  const resetFiltersInStore = useFilterStore((s) => s.resetFilters);

  const [searchParams, setSearchParams] = useSearchParams();
  const hydrated = useRef(false);

  // Hydrate from URL once on first mount
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const obj: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      obj[k] = v;
    });
    if (Object.keys(obj).length === 0) return;
    const parsed = FilterStateSchema.safeParse(obj);
    if (parsed.success) replaceFiltersInStore(parsed.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync store → URL (one-way mirror)
  useEffect(() => {
    if (!hydrated.current) return;
    const params = filtersToParams(filters);
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) sp.set(k, v);
    }
    setSearchParams(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return {
    filters,
    setFilters: setFiltersInStore,
    replaceFilters: replaceFiltersInStore,
    resetFilters: resetFiltersInStore,
  };
}
