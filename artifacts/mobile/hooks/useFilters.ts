import { useEffect, useRef } from "react";
import { useLocalSearchParams } from "expo-router";
import { FilterStateSchema, type FilterState } from "@workspace/filters";
import { useFilterStore } from "../lib/filterStore";

export type FilterPatch = Partial<FilterState>;

/**
 * Filter state lives in a Zustand store (single source of truth on mobile).
 * The URL is read once on cold mount so deep links / shared links work, but
 * subsequent mutations stay in the store — no router.setParams in the hot
 * path, which avoids every expo-router timing failure mode.
 */
export function useFilters() {
  const filters = useFilterStore((s) => s.filters);
  const setFilters = useFilterStore((s) => s.setFilters);
  const replaceFilters = useFilterStore((s) => s.replaceFilters);
  const resetFilters = useFilterStore((s) => s.resetFilters);

  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const obj: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      obj[k] = Array.isArray(v) ? (v[0] ?? "") : (v as string);
    }
    if (Object.keys(obj).length === 0) return;
    const parsed = FilterStateSchema.safeParse(obj);
    if (parsed.success) replaceFilters(parsed.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    filters,
    setFilters,
    replaceFilters,
    resetFilters,
  };
}
