import { useQuery } from "@tanstack/react-query";
import { Bed, Bath, X } from "lucide-react";
import type { FilterState } from "@workspace/filters";

type Props = {
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
};

type Category = { id: string; name: string };
type PriceBounds = { p10: number; p90: number; min: number; max: number };

function formatCompact(n: number): string {
  if (!n) return "Any";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

export default function StandardFilters({ filters, setFilters }: Props) {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories", { credentials: "include" });
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const { data: bounds } = useQuery<PriceBounds>({
    queryKey: ["price-bounds"],
    queryFn: async () => {
      const res = await fetch("/api/properties/price-bounds", { credentials: "include" });
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const noneSelected = filters.types.length === 0;
  const minPlaceholder = bounds ? formatCompact(bounds.p10).replace("$", "") : "Any";
  const maxPlaceholder = bounds ? formatCompact(bounds.p90).replace("$", "") : "Any";

  const toggleType = (name: string) => {
    const lower = name.toLowerCase();
    const current = filters.types;
    const next = current.some((t) => t.toLowerCase() === lower)
      ? current.filter((t) => t.toLowerCase() !== lower)
      : [...current, name];
    setFilters({ types: next });
  };

  return (
    <div className="space-y-3">
      {/* Type chips with All */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip
          label="All"
          active={noneSelected}
          onClick={() => setFilters({ types: [] })}
        />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            active={filters.types.some(
              (t) => t.toLowerCase() === c.name.toLowerCase()
            )}
            onClick={() => toggleType(c.name)}
          />
        ))}
      </div>

      {/* Price section */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-brand-warm font-medium mb-1">
          Price range (USD)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <PriceField
            label="Min"
            value={filters.min}
            placeholder={minPlaceholder}
            onChange={(v) => setFilters({ min: v })}
          />
          <PriceField
            label="Max"
            value={filters.max}
            placeholder={maxPlaceholder}
            onChange={(v) => setFilters({ max: v })}
          />
        </div>
      </div>

      {/* Beds + Baths */}
      <div className="grid grid-cols-2 gap-2">
        <Stepper
          icon={<Bed size={14} />}
          label="Beds"
          value={filters.beds}
          onChange={(v) => setFilters({ beds: v })}
        />
        <Stepper
          icon={<Bath size={14} />}
          label="Baths"
          value={filters.baths}
          onChange={(v) => setFilters({ baths: v })}
          step={0.5}
        />
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-brand-dark text-brand-offwhite border-brand-dark"
          : "bg-white text-brand-warm border-brand-border hover:border-brand-dark"
      }`}
    >
      {label}
    </button>
  );
}

function PriceField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | undefined;
  placeholder: string;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="flex items-center h-9 px-2.5 bg-white border border-brand-border rounded-lg focus-within:border-brand-dark">
      <span className="text-[11px] uppercase tracking-wide text-brand-warm font-medium mr-1.5">
        {label}
      </span>
      <span className="text-sm text-brand-warm mr-0.5">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={value !== undefined ? String(value) : ""}
        onChange={(e) => {
          const t = e.target.value;
          if (!t) {
            onChange(undefined);
            return;
          }
          const digits = t.replace(/[^\d]/g, "");
          if (!digits) {
            onChange(undefined);
            return;
          }
          const n = Number(digits);
          if (Number.isFinite(n)) onChange(n);
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 text-sm text-brand-dark placeholder:text-brand-warm bg-transparent focus:outline-none"
      />
      {value !== undefined && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-brand-warm hover:text-brand-dark"
          aria-label={`Clear ${label.toLowerCase()}`}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function Stepper({
  icon,
  label,
  value,
  onChange,
  step = 1,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
}) {
  const display =
    value === undefined ? `Any ${label.toLowerCase()}` : `${value}+ ${label.toLowerCase()}`;
  return (
    <div className="flex items-center gap-1 h-9 px-2 bg-white border border-brand-border rounded-lg">
      <span className="text-brand-warm">{icon}</span>
      <button
        type="button"
        onClick={() => {
          if (value === undefined || value <= step) onChange(undefined);
          else onChange(Math.max(0, value - step));
        }}
        className="text-brand-warm hover:text-brand-dark px-1"
        aria-label={`decrease ${label}`}
      >
        −
      </button>
      <span className="flex-1 text-center text-xs text-brand-dark truncate">
        {display}
      </span>
      <button
        type="button"
        onClick={() => onChange((value ?? 0) + step)}
        className="text-brand-warm hover:text-brand-dark px-1"
        aria-label={`increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
