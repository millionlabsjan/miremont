import { create } from "zustand";
import { FilterStateSchema, type FilterState } from "@workspace/filters";

const DEFAULT: FilterState = FilterStateSchema.parse({});

type FilterStore = {
  filters: FilterState;
  setFilters: (
    next:
      | Partial<FilterState>
      | ((prev: FilterState) => Partial<FilterState>)
  ) => void;
  replaceFilters: (next: FilterState) => void;
  resetFilters: () => void;
};

export const useFilterStore = create<FilterStore>((set) => ({
  filters: DEFAULT,
  setFilters: (next) =>
    set((state) => {
      const patch = typeof next === "function" ? next(state.filters) : next;
      return { filters: { ...state.filters, ...patch } };
    }),
  replaceFilters: (next) => set({ filters: next }),
  resetFilters: () => set({ filters: DEFAULT }),
}));
