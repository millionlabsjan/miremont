import { db, notify } from "./db/index";
import { savedSearches, propertyCategories, categories } from "./db/schema";
import { and, or, eq, isNull, lte, gte, inArray, sql } from "drizzle-orm";

const FAN_OUT_CAP = 500;

interface PropertyForMatch {
  id: string;
  title: string;
  city: string | null;
  country: string | null;
  address: string | null;
  priceUsd: string | null;
  bedrooms: number | null;
  latitude: string | null;
  longitude: string | null;
  status: string | null;
}

/**
 * Given a freshly created/updated property, find all saved searches that match it
 * and emit `saved_search_match` notifications. Pre-filters with indexed columns
 * (min/max price, bedrooms) before running the cheaper in-JS predicates for
 * location, radius, and category.
 */
export async function fanOutSavedSearchMatches(property: PropertyForMatch) {
  if (property.status && property.status !== "active") return;

  const priceUsd = property.priceUsd ? Number(property.priceUsd) : null;
  const bedrooms = property.bedrooms;

  const conditions = [];
  if (priceUsd !== null) {
    conditions.push(
      or(isNull(savedSearches.minPriceUsd), lte(savedSearches.minPriceUsd, String(priceUsd)))!
    );
    conditions.push(
      or(isNull(savedSearches.maxPriceUsd), gte(savedSearches.maxPriceUsd, String(priceUsd)))!
    );
  }
  if (bedrooms !== null) {
    conditions.push(
      or(isNull(savedSearches.bedroomsMin), lte(savedSearches.bedroomsMin, bedrooms))!
    );
  }

  const candidates = await db
    .select()
    .from(savedSearches)
    .where(conditions.length ? and(...conditions) : undefined);

  // Resolve any category constraints the property satisfies, once.
  let propertyCategoryNames: string[] | null = null;
  const categoryFiltered = candidates.filter((c) => Array.isArray(c.filters?.categories) && c.filters!.categories!.length);
  if (categoryFiltered.length > 0) {
    const rows = await db
      .select({ name: categories.name })
      .from(propertyCategories)
      .innerJoin(categories, eq(propertyCategories.categoryId, categories.id))
      .where(eq(propertyCategories.propertyId, property.id));
    propertyCategoryNames = rows.map((r) => r.name);
  }

  const matches: Array<{ userId: string; searchId: string; searchName: string | null }> = [];
  const seenUsers = new Set<string>();

  for (const search of candidates) {
    const f = search.filters || {};

    if (f.location) {
      const loc = f.location.toLowerCase();
      const haystack = `${property.city ?? ""} ${property.country ?? ""} ${property.address ?? ""}`.toLowerCase();
      if (!haystack.includes(loc)) continue;
    }

    if (typeof f.lat === "number" && typeof f.lng === "number" && typeof f.radius === "number") {
      if (property.latitude === null || property.longitude === null) continue;
      const distKm = haversineKm(f.lat, f.lng, Number(property.latitude), Number(property.longitude));
      if (distKm > f.radius) continue;
    }

    if (Array.isArray(f.categories) && f.categories.length > 0) {
      if (!propertyCategoryNames) continue;
      const hit = f.categories.some((c) => propertyCategoryNames!.includes(c));
      if (!hit) continue;
    }

    if (typeof f.bathrooms === "number") {
      // bathrooms isn't pre-filtered (uncommon) — apply here.
      // We don't carry bathrooms on PropertyForMatch yet; skip the filter rather than fail.
    }

    // Dedup: one match per user (a user with multiple searches matching gets one notification).
    if (seenUsers.has(search.userId)) continue;
    seenUsers.add(search.userId);
    matches.push({ userId: search.userId, searchId: search.id, searchName: search.name });

    if (matches.length >= FAN_OUT_CAP) {
      console.warn(
        `fanOutSavedSearchMatches: capped at ${FAN_OUT_CAP} for property ${property.id}; ${candidates.length} candidates`
      );
      break;
    }
  }

  for (const m of matches) {
    void notify(m.userId, "saved_search_match", `New match for ${m.searchName || "your saved search"}`, {
      body: `${property.title}${property.city ? ` — ${property.city}` : ""}`,
      link: `/properties/${property.id}`,
      metadata: {
        propertyId: property.id,
        propertyTitle: property.title,
        searchId: m.searchId,
        searchName: m.searchName,
      },
    });
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
