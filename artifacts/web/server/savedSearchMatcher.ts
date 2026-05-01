import { db } from "./db/index";
import { properties, propertyCategories, categories } from "./db/schema";
import {
  and,
  eq,
  gte,
  lte,
  ilike,
  or,
  inArray,
  gt,
  sql,
} from "drizzle-orm";

interface SavedSearchFilters {
  location?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  minPrice?: number;
  maxPrice?: number;
  categories?: string[];
  bedrooms?: number;
  bathrooms?: number;
}

export interface SavedSearchInput {
  id: string;
  filters: SavedSearchFilters | null;
}

export interface MatchedProperty {
  id: string;
  title: string;
  city: string | null;
  country: string | null;
  price: string;
  currency: string | null;
  images: string[] | null;
}

/**
 * Find active properties listed after `sinceDate` that match the saved search's filters.
 * Mirrors the filter semantics of GET /api/properties so digest matches what the user sees in-app.
 */
export async function findMatches(
  search: SavedSearchInput,
  sinceDate: Date
): Promise<MatchedProperty[]> {
  const f = search.filters || {};

  const conditions = [
    eq(properties.status, "active"),
    gt(properties.listedDate, sinceDate),
  ];

  if (f.location) {
    conditions.push(
      or(
        ilike(properties.city, `%${f.location}%`),
        ilike(properties.country, `%${f.location}%`),
        ilike(properties.address, `%${f.location}%`)
      )!
    );
  }
  if (typeof f.minPrice === "number")
    conditions.push(gte(properties.priceUsd, String(f.minPrice)));
  if (typeof f.maxPrice === "number")
    conditions.push(lte(properties.priceUsd, String(f.maxPrice)));
  if (typeof f.bedrooms === "number")
    conditions.push(gte(properties.bedrooms, f.bedrooms));
  if (typeof f.bathrooms === "number")
    conditions.push(gte(properties.bathrooms, String(f.bathrooms)));

  // Optional radius filter (if the saved search includes lat/lng + radius in km).
  if (
    typeof f.lat === "number" &&
    typeof f.lng === "number" &&
    typeof f.radius === "number"
  ) {
    // Haversine in SQL — ~good enough at small radii.
    conditions.push(
      sql`(6371 * acos(
        cos(radians(${f.lat}))
        * cos(radians(${properties.latitude}::float))
        * cos(radians(${properties.longitude}::float) - radians(${f.lng}))
        + sin(radians(${f.lat}))
        * sin(radians(${properties.latitude}::float))
      )) <= ${f.radius}`
    );
  }

  // Category filter: only properties that join to one of the requested category names.
  if (f.categories?.length) {
    const matchedIds = await db
      .selectDistinct({ propertyId: propertyCategories.propertyId })
      .from(propertyCategories)
      .innerJoin(categories, eq(propertyCategories.categoryId, categories.id))
      .where(inArray(categories.name, f.categories));
    const ids = matchedIds.map((m) => m.propertyId);
    if (ids.length === 0) return [];
    conditions.push(inArray(properties.id, ids));
  }

  const rows = await db
    .select({
      id: properties.id,
      title: properties.title,
      city: properties.city,
      country: properties.country,
      price: properties.price,
      currency: properties.currency,
      images: properties.images,
    })
    .from(properties)
    .where(and(...conditions));

  return rows;
}
