import { z } from "zod";
import { ALL_FEATURE_IDS, getFeatureLabel } from "./catalog";

const VALID_FEATURE_SET = new Set<string>(ALL_FEATURE_IDS);

const csvNumberArray = z
  .string()
  .optional()
  .transform((v) =>
    v
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  );

const csvStringArray = z
  .string()
  .optional()
  .transform((v) =>
    v
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  );

const numericString = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  });

const intString = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return undefined;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  });

export const SortSchema = z
  .enum(["newest", "price_asc", "price_desc"])
  .default("newest");

export const FilterStateSchema = z
  .object({
    q: z.string().optional().default(""),
    lat: numericString,
    lng: numericString,
    radius: numericString,
    min: numericString,
    max: numericString,
    types: csvStringArray,
    beds: intString,
    baths: numericString,
    features: csvStringArray.transform((arr) =>
      arr.filter((id) => VALID_FEATURE_SET.has(id))
    ),
    sort: z
      .string()
      .optional()
      .transform((v) =>
        v === "price_asc" || v === "price_desc" || v === "newest"
          ? v
          : "newest"
      ),
    page: intString.transform((v) => (v && v > 0 ? v : 1)),
    limit: intString.transform((v) => {
      if (!v) return 20;
      return Math.min(Math.max(v, 1), 100);
    }),
  })
  .superRefine((val, ctx) => {
    const hasLat = val.lat !== undefined;
    const hasLng = val.lng !== undefined;
    const hasRadius = val.radius !== undefined;
    const anyGeo = hasLat || hasLng || hasRadius;
    const allGeo = hasLat && hasLng && hasRadius;
    if (anyGeo && !allGeo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lat, lng, and radius must all be provided together",
      });
    }
    if (val.min !== undefined && val.max !== undefined && val.min > val.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "min must be <= max",
        path: ["min"],
      });
    }
  });

export type FilterState = z.infer<typeof FilterStateSchema>;

export const SavedSearchPayloadSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  filters: z.record(z.string(), z.union([z.string(), z.number()]).optional()),
});

function formatPriceCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

export function summarizeFilters(f: FilterState): string[] {
  const out: string[] = [];
  if (f.q) out.push(`"${f.q}"`);
  if (f.types.length > 0) out.push(f.types.join(" · "));
  if (f.min !== undefined || f.max !== undefined) {
    const lo = f.min !== undefined ? formatPriceCompact(f.min) : "Any";
    const hi = f.max !== undefined ? formatPriceCompact(f.max) : "Any";
    out.push(`${lo} – ${hi}`);
  }
  if (f.beds !== undefined) out.push(`${f.beds}+ beds`);
  if (f.baths !== undefined) out.push(`${f.baths}+ baths`);
  if (f.lat !== undefined && f.lng !== undefined && f.radius !== undefined) {
    out.push(`Within ${f.radius} km`);
  }
  for (const id of f.features) {
    const label = getFeatureLabel(id);
    if (label) out.push(label);
  }
  return out;
}

export function hasActiveFilters(f: FilterState): boolean {
  return Boolean(
    (f.q && f.q.length > 0) ||
      f.types.length > 0 ||
      f.min !== undefined ||
      f.max !== undefined ||
      f.beds !== undefined ||
      f.baths !== undefined ||
      f.features.length > 0 ||
      f.lat !== undefined ||
      f.lng !== undefined ||
      f.radius !== undefined
  );
}
