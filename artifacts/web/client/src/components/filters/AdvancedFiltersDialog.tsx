import { useState, useMemo } from "react";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import Dialog from "../ui/Dialog";
import { ADVANCED_GROUPS, type FilterState } from "@workspace/filters";

type Props = {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
  onSaveSearch?: () => void;
};

export default function AdvancedFiltersDialog({
  open,
  onClose,
  filters,
  setFilters,
  onSaveSearch,
}: Props) {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const activeGroup = useMemo(
    () => ADVANCED_GROUPS.find((g) => g.id === activeGroupId) ?? null,
    [activeGroupId]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const group of ADVANCED_GROUPS) {
      let n = 0;
      for (const opt of group.options) {
        if (filters.features.includes(opt.id)) n++;
      }
      map[group.id] = n;
    }
    return map;
  }, [filters.features]);

  const totalSelected = filters.features.length;

  const toggleFeature = (id: string) => {
    const current = filters.features;
    const next = current.includes(id)
      ? current.filter((f) => f !== id)
      : [...current, id];
    setFilters({ features: next });
  };

  const clearAll = () => {
    setFilters({ features: [] });
    setActiveGroupId(null);
  };

  const handleClose = () => {
    setActiveGroupId(null);
    onClose();
  };

  const title = activeGroup ? activeGroup.title : "Advanced search";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <button
            onClick={clearAll}
            className="text-sm text-brand-warm hover:text-brand-dark"
            disabled={totalSelected === 0}
          >
            Clear ({totalSelected})
          </button>
          <div className="flex gap-2">
            {onSaveSearch && (
              <button
                onClick={onSaveSearch}
                className="text-sm px-4 h-9 rounded-lg border border-brand-border text-brand-dark hover:border-brand-dark"
              >
                Save search
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-sm px-4 h-9 rounded-lg bg-brand-dark text-brand-offwhite hover:bg-brand-dark/90"
            >
              Show results
            </button>
          </div>
        </>
      }
    >
      {!activeGroup ? (
        <ul className="divide-y divide-brand-border">
          {ADVANCED_GROUPS.map((group) => (
            <li key={group.id}>
              <button
                onClick={() => setActiveGroupId(group.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-brand-input/40"
              >
                <div>
                  <p className="text-sm font-medium text-brand-dark">
                    {group.title}
                  </p>
                  <p className="text-xs text-brand-warm mt-0.5">
                    {group.options.length} options
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {counts[group.id] > 0 && (
                    <span className="bg-brand-dark text-brand-offwhite text-[10px] font-bold px-1.5 h-5 min-w-[20px] rounded-full inline-flex items-center justify-center">
                      {counts[group.id]}
                    </span>
                  )}
                  <ChevronRight size={16} className="text-brand-warm" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-5">
          <button
            onClick={() => setActiveGroupId(null)}
            className="flex items-center gap-1 text-xs text-brand-warm hover:text-brand-dark mb-4"
          >
            <ChevronLeft size={14} /> Back to all groups
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeGroup.options.map((opt) => {
              const checked = filters.features.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleFeature(opt.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                    checked
                      ? "bg-brand-dark/5 border-brand-dark text-brand-dark"
                      : "bg-white border-brand-border text-brand-dark hover:border-brand-dark"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked
                        ? "bg-brand-dark border-brand-dark text-brand-offwhite"
                        : "border-brand-border bg-white"
                    }`}
                  >
                    {checked && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="flex-1">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Dialog>
  );
}
