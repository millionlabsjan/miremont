import { Router } from "express";
import { db, notify } from "../db/index";
import {
  properties,
  propertyCategories,
  favorites,
  categories,
  users,
} from "../db/schema";
import {
  eq,
  and,
  gte,
  lte,
  ilike,
  or,
  sql,
  desc,
  asc,
  count,
  inArray,
} from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";
import { MIN_PROPERTY_PRICE_USD } from "../../shared/constants";
import { getRates, convert } from "../services/exchangeRates";
import { fanOutSavedSearchMatches } from "../savedSearchInverseMatcher";
import { sendPropertyUpdateEmail } from "../email";
import { FilterStateSchema, groupFeaturesByCategory } from "@workspace/filters";

export const propertiesRouter = Router();

// Exchange rates endpoint
propertiesRouter.get("/rates", async (_req, res) => {
  const rates = await getRates();
  res.json({ rates });
});

// Price bounds (p10/p90) for slider smart defaults — cached 60s in-process
let priceBoundsCache: { at: number; data: { p10: number; p90: number; min: number; max: number } } | null = null;
const PRICE_BOUNDS_TTL_MS = 60_000;
propertiesRouter.get("/price-bounds", async (_req, res) => {
  const now = Date.now();
  if (priceBoundsCache && now - priceBoundsCache.at < PRICE_BOUNDS_TTL_MS) {
    return res.json(priceBoundsCache.data);
  }
  const [row] = await db.execute<{ p10: string | null; p90: string | null; min: string | null; max: string | null }>(
    sql`SELECT
      percentile_cont(0.1) WITHIN GROUP (ORDER BY price_usd) AS p10,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY price_usd) AS p90,
      MIN(price_usd) AS min,
      MAX(price_usd) AS max
    FROM properties WHERE status = 'active' AND price_usd IS NOT NULL`
  );
  const data = {
    p10: Number(row?.p10) || 0,
    p90: Number(row?.p90) || 0,
    min: Number(row?.min) || 0,
    max: Number(row?.max) || 0,
  };
  priceBoundsCache = { at: now, data };
  res.json(data);
});

// Search/browse properties
propertiesRouter.get("/", async (req, res) => {
  const parsed = FilterStateSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0].message });
  }
  const f = parsed.data;
  const page = f.page;
  const limit = f.limit;
  const offset = (page - 1) * limit;
  const q = f.q || "";

  const conditions = [eq(properties.status, "active")];

  if (q) {
    conditions.push(
      or(
        ilike(properties.title, `%${q}%`),
        ilike(properties.address, `%${q}%`),
        ilike(properties.city, `%${q}%`),
        ilike(properties.country, `%${q}%`)
      )!
    );
  }
  if (f.min !== undefined) conditions.push(gte(properties.priceUsd, String(f.min)));
  if (f.max !== undefined) conditions.push(lte(properties.priceUsd, String(f.max)));
  if (f.beds !== undefined) conditions.push(gte(properties.bedrooms, f.beds));
  if (f.baths !== undefined) conditions.push(gte(properties.bathrooms, String(f.baths)));

  // Property types: match category names (case-insensitive), or accept UUIDs
  if (f.types.length > 0) {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ids = f.types.filter((t) => uuidRe.test(t));
    const names = f.types.filter((t) => !uuidRe.test(t)).map((n) => n.toLowerCase());
    const orParts = [] as ReturnType<typeof sql>[];
    if (ids.length) orParts.push(sql`${categories.id} IN (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`);
    if (names.length) orParts.push(sql`LOWER(${categories.name}) IN (${sql.join(names.map((n) => sql`${n}`), sql`, `)})`);
    const matchSql = orParts.length === 1 ? orParts[0] : sql`(${sql.join(orParts, sql` OR `)})`;
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${propertyCategories}
        INNER JOIN ${categories} ON ${categories.id} = ${propertyCategories.categoryId}
        WHERE ${propertyCategories.propertyId} = ${properties.id}
        AND ${matchSql}
      )`
    );
  }

  // Geo radius (Haversine, km)
  if (f.lat !== undefined && f.lng !== undefined && f.radius !== undefined) {
    conditions.push(
      sql`(6371 * acos(
        cos(radians(${f.lat})) * cos(radians(CAST(${properties.latitude} AS DOUBLE PRECISION))) *
        cos(radians(CAST(${properties.longitude} AS DOUBLE PRECISION)) - radians(${f.lng})) +
        sin(radians(${f.lat})) * sin(radians(CAST(${properties.latitude} AS DOUBLE PRECISION)))
      )) <= ${f.radius}`
    );
  }

  // Features: OR-within group, AND-across groups via jsonb ?| per group
  if (f.features.length > 0) {
    const grouped = groupFeaturesByCategory(f.features);
    for (const opts of grouped.values()) {
      conditions.push(
        sql`${properties.features} ?| ARRAY[${sql.join(
          opts.map((o) => sql`${o}`),
          sql`, `
        )}]::text[]`
      );
    }
  }

  const where = and(...conditions);
  const sort = f.sort;

  const orderBy =
    sort === "price_asc"
      ? asc(properties.priceUsd)
      : sort === "price_desc"
      ? desc(properties.priceUsd)
      : desc(properties.listedDate);

  const [propertyList, [{ total }]] = await Promise.all([
    db.select().from(properties).where(where).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ total: count() }).from(properties).where(where),
  ]);

  // Get categories for each property
  const propIds = propertyList.map((p) => p.id);
  let propCategories: Record<string, string[]> = {};
  if (propIds.length > 0) {
    const cats = await db
      .select({
        propertyId: propertyCategories.propertyId,
        categoryName: categories.name,
      })
      .from(propertyCategories)
      .innerJoin(categories, eq(propertyCategories.categoryId, categories.id))
      .where(inArray(propertyCategories.propertyId, propIds));
    for (const c of cats) {
      if (!propCategories[c.propertyId]) propCategories[c.propertyId] = [];
      propCategories[c.propertyId].push(c.categoryName);
    }
  }

  // Get agent names
  const agentIds = [...new Set(propertyList.map((p) => p.userId))];
  let agentNames: Record<string, string> = {};
  if (agentIds.length > 0) {
    const agents = await db
      .select({ id: users.id, agencyName: users.agencyName, name: users.name })
      .from(users)
      .where(inArray(users.id, agentIds));
    for (const a of agents) {
      agentNames[a.id] = a.agencyName || a.name;
    }
  }

  // Check favorites if user is logged in
  let userFavorites = new Set<string>();
  if (req.session.userId && propIds.length > 0) {
    const favs = await db
      .select({ propertyId: favorites.propertyId })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, req.session.userId),
          inArray(favorites.propertyId, propIds)
        )
      );
    userFavorites = new Set(favs.map((f) => f.propertyId));
  }

  res.json({
    properties: propertyList.map((p) => ({
      ...p,
      categories: propCategories[p.id] || [],
      agentName: agentNames[p.userId] || "Unknown",
      isFavorited: userFavorites.has(p.id),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// Get single property
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
propertiesRouter.get("/:id", async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(404).json({ message: "Property not found" });
  }
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, req.params.id))
    .limit(1);

  if (!property) return res.status(404).json({ message: "Property not found" });

  // Get categories
  const cats = await db
    .select({ name: categories.name })
    .from(propertyCategories)
    .innerJoin(categories, eq(propertyCategories.categoryId, categories.id))
    .where(eq(propertyCategories.propertyId, property.id));

  // Get agent info
  const [agent] = await db
    .select({
      id: users.id,
      name: users.name,
      agencyName: users.agencyName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, property.userId))
    .limit(1);

  // Check favorite
  let isFavorited = false;
  if (req.session.userId) {
    const [fav] = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, req.session.userId),
          eq(favorites.propertyId, property.id)
        )
      )
      .limit(1);
    isFavorited = !!fav;
  }

  res.json({
    ...property,
    categories: cats.map((c) => c.name),
    agent,
    isFavorited,
  });
});

// Create property (agent only)
propertiesRouter.post("/", requireRole("agent"), async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    price: z.number().min(MIN_PROPERTY_PRICE_USD),
    currency: z.string().default("USD"),
    size: z.number().optional(),
    sizeUnit: z.enum(["sqm", "sqft"]).optional(),
    bedrooms: z.number().int().optional(),
    bathrooms: z.number().optional(),
    yearBuilt: z.number().int().optional(),
    features: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    categoryIds: z.array(z.string()).optional(),
  });

  try {
    const data = schema.parse(req.body);

    const [property] = await db
      .insert(properties)
      .values({
        userId: req.session.userId!,
        title: data.title,
        description: data.description,
        latitude: data.latitude?.toString(),
        longitude: data.longitude?.toString(),
        address: data.address,
        country: data.country,
        city: data.city,
        price: data.price.toString(),
        currency: data.currency,
        priceUsd: convert(data.price, data.currency, "USD", await getRates()).toString(),
        size: data.size?.toString(),
        sizeUnit: data.sizeUnit,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms?.toString(),
        yearBuilt: data.yearBuilt,
        features: data.features,
        images: data.images,
      })
      .returning();

    if (data.categoryIds?.length) {
      await db.insert(propertyCategories).values(
        data.categoryIds.map((cid) => ({
          propertyId: property.id,
          categoryId: cid,
        }))
      );
    }

    // Notify all admins about new property
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    await Promise.all(admins.map((a) => notify(a.id, "new_property", `New property listed`, {
      body: `${property.title} in ${property.city}, ${property.country}`,
      link: `/properties/${property.id}`,
      metadata: { propertyId: property.id, title: property.title },
    })));

    // Real-time saved-search match fan-out (fire-and-forget)
    void fanOutSavedSearchMatches(property);

    res.status(201).json(property);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    console.error("Create property error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update property (agent, own property only)
propertiesRouter.put("/:id", requireRole("agent"), async (req, res) => {
  const [existing] = await db
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.id, req.params.id),
        eq(properties.userId, req.session.userId!)
      )
    )
    .limit(1);

  if (!existing) return res.status(404).json({ message: "Property not found" });

  const { categoryIds, ...updateData } = req.body;

  const [updated] = await db
    .update(properties)
    .set({
      ...updateData,
      price: updateData.price?.toString(),
      priceUsd: updateData.price
        ? convert(Number(updateData.price), updateData.currency || existing.currency || "USD", "USD", await getRates()).toString()
        : undefined,
      size: updateData.size?.toString(),
      latitude: updateData.latitude?.toString(),
      longitude: updateData.longitude?.toString(),
      bathrooms: updateData.bathrooms?.toString(),
      lastUpdated: new Date(),
    })
    .where(eq(properties.id, req.params.id))
    .returning();

  if (categoryIds) {
    await db
      .delete(propertyCategories)
      .where(eq(propertyCategories.propertyId, req.params.id));
    if (categoryIds.length > 0) {
      await db.insert(propertyCategories).values(
        categoryIds.map((cid: string) => ({
          propertyId: req.params.id,
          categoryId: cid,
        }))
      );
    }
  }

  // Notify users who favorited this property about price/status changes
  const priceChanged = updateData.price && String(updateData.price) !== String(existing.price);
  const statusChanged = updateData.status && updateData.status !== existing.status;
  const oldPriceNum = Number(existing.price);
  const newPriceNum = Number(updated.price);
  const isDrop = priceChanged && newPriceNum < oldPriceNum;

  if (priceChanged || statusChanged) {
    const sym = updated.currency === "GBP" ? "£" : updated.currency === "USD" ? "$" : "€";
    const changes: string[] = [];
    if (priceChanged) {
      changes.push(`${isDrop ? "Price drop" : "Price changed"} from ${sym}${oldPriceNum.toLocaleString()} to ${sym}${newPriceNum.toLocaleString()}`);
    }
    if (statusChanged) {
      changes.push(`Status changed to ${updated.status}`);
    }
    const changeDesc = changes.join(". ");

    const type = isDrop ? "price_drop" : "property_update";
    const titlePrefix = isDrop ? "Price drop on" : "Update on";
    const pctChange = priceChanged && oldPriceNum > 0 ? Math.round(((newPriceNum - oldPriceNum) / oldPriceNum) * 100) : null;

    const favUsers = await db
      .select({ userId: favorites.userId })
      .from(favorites)
      .where(eq(favorites.propertyId, req.params.id));

    for (const fav of favUsers) {
      notify(fav.userId, type, `${titlePrefix} ${updated.title}`, {
        body: changeDesc,
        link: `/properties/${updated.id}`,
        metadata: {
          propertyId: updated.id,
          propertyTitle: updated.title,
          oldPrice: priceChanged ? oldPriceNum : undefined,
          newPrice: priceChanged ? newPriceNum : undefined,
          currency: updated.currency,
          pctChange,
          newStatus: statusChanged ? updated.status : undefined,
        },
      });
    }
  }

  // Real-time saved-search re-fan-out when fields that affect matching change
  const locationChanged =
    (updateData.latitude && String(updateData.latitude) !== String(existing.latitude)) ||
    (updateData.longitude && String(updateData.longitude) !== String(existing.longitude)) ||
    (updateData.city && updateData.city !== existing.city) ||
    (updateData.country && updateData.country !== existing.country);
  const becameActive = statusChanged && updated.status === "active";
  if (priceChanged || becameActive || locationChanged) {
    void fanOutSavedSearchMatches(updated);
  }

  res.json(updated);
});

// Toggle favorite
propertiesRouter.post("/:id/favorite", requireAuth, async (req, res) => {
  const [existing] = await db
    .select()
    .from(favorites)
    .where(
      and(
        eq(favorites.userId, req.session.userId!),
        eq(favorites.propertyId, req.params.id)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, req.session.userId!),
          eq(favorites.propertyId, req.params.id)
        )
      );
    res.json({ favorited: false });
  } else {
    await db.insert(favorites).values({
      userId: req.session.userId!,
      propertyId: req.params.id,
    });
    res.json({ favorited: true });
  }
});

// Get favorites
propertiesRouter.get("/user/favorites", requireAuth, async (req, res) => {
  const favProps = await db
    .select({ property: properties })
    .from(favorites)
    .innerJoin(properties, eq(favorites.propertyId, properties.id))
    .where(eq(favorites.userId, req.session.userId!))
    .orderBy(desc(favorites.createdAt));

  res.json(favProps.map((f) => ({ ...f.property, isFavorited: true })));
});

// Agent: my listings
propertiesRouter.get("/user/my-listings", requireRole("agent"), async (req, res) => {
  const myProps = await db
    .select()
    .from(properties)
    .where(eq(properties.userId, req.session.userId!))
    .orderBy(desc(properties.createdAt));

  res.json(myProps);
});
