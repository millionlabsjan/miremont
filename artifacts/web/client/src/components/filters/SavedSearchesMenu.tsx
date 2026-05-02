import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bookmark, Trash2, X } from "lucide-react";
import {
  filterStateToTyped,
  typedSavedToFilterState,
  summarizeFilters,
  hasActiveFilters,
  type FilterState,
} from "@workspace/filters";
import { apiRequest } from "../../lib/queryClient";

type SavedSearch = {
  id: string;
  name: string | null;
  filters: any;
  createdAt: string;
};

type Props = {
  filters: FilterState;
  onLoad: (next: FilterState) => void;
};

export default function SavedSearchesMenu({ filters, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const canSave = hasActiveFilters(filters);

  const { data: searches = [], isLoading } = useQuery<SavedSearch[]>({
    queryKey: ["saved-searches"],
    queryFn: async () => {
      const res = await fetch("/api/searches", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest(`/api/searches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, filters: filterStateToTyped(filters) }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/searches/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });

  const handleSave = () => {
    if (!canSave) return;
    const name = window.prompt("Name this search:");
    if (name?.trim()) saveMutation.mutate(name.trim());
  };

  const handleLoad = (s: SavedSearch) => {
    try {
      const next = typedSavedToFilterState(s.filters);
      onLoad(next);
      setOpen(false);
    } catch {
      // Skip malformed legacy entries
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Saved searches"
        className="text-brand-warm hover:text-brand-dark"
      >
        <Bookmark size={18} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-40 w-80 bg-white border border-brand-border rounded-lg shadow-lg">
            <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border">
              <p className="text-xs font-semibold text-brand-dark">Saved searches</p>
              <button onClick={() => setOpen(false)} className="text-brand-warm">
                <X size={14} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <p className="px-3 py-4 text-xs text-brand-warm">Loading…</p>
              ) : searches.length === 0 ? (
                <p className="px-3 py-4 text-xs text-brand-warm">
                  No saved searches yet. Set up filters and save below.
                </p>
              ) : (
                <ul className="divide-y divide-brand-border">
                  {searches.map((s) => {
                    let tags: string[] = [];
                    try {
                      tags = summarizeFilters(typedSavedToFilterState(s.filters));
                    } catch {
                      tags = [];
                    }
                    return (
                      <li
                        key={s.id}
                        className="flex items-start gap-2 px-3 py-2.5 hover:bg-brand-input/40"
                      >
                        <button
                          onClick={() => handleLoad(s)}
                          className="flex-1 text-left min-w-0"
                        >
                          <p className="text-sm font-medium text-brand-dark truncate">
                            {s.name || "Untitled search"}
                          </p>
                          {tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tags.slice(0, 4).map((tag, i) => (
                                <span
                                  key={`${s.id}-tag-${i}`}
                                  className="px-1.5 py-0.5 rounded-md bg-brand-input text-[10px] text-brand-dark"
                                >
                                  {tag}
                                </span>
                              ))}
                              {tags.length > 4 && (
                                <span className="text-[10px] text-brand-warm py-0.5">
                                  +{tags.length - 4} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-brand-warm mt-1">No filters set</p>
                          )}
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(s.id)}
                          className="text-brand-warm hover:text-red-600 mt-0.5"
                          aria-label="Delete saved search"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="border-t border-brand-border p-2">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || !canSave}
                className={`w-full text-xs h-8 rounded ${
                  canSave
                    ? "bg-brand-dark text-brand-offwhite hover:bg-brand-dark/90"
                    : "bg-brand-input text-brand-warm cursor-not-allowed"
                } disabled:opacity-50`}
              >
                {canSave ? "Save current search" : "Set filters first to save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
