import { Router } from "express";
import { db } from "../db/index";
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

export const propertiesRouter = Router();

// Search/browse properties
propertiesRouter.get("/", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const q = (req.query.q as string) || "";
  const minPrice = req.query.minPrice
    ? parseFloat(req.query.minPrice as string)
    : undefined;
  const maxPrice = req.query.maxPrice
    ? parseFloat(req.query.maxPrice as string)
    : undefined;
  const categoryIds = req.query.categories
    ? (req.query.categories as string).split(",")
    : undefined;
  const sort = (req.query.sort as string) || "newest";
  const country = req.query.country as string;
  const city = req.query.city as string;
  const minBedrooms = req.query.minBedrooms
    ? parseInt(req.query.minBedrooms as string)
    : undefined;

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
  if (minPrice) conditions.push(gte(properties.priceUsd, String(minPrice)));
  if (maxPrice) conditions.push(lte(properties.priceUsd, String(maxPrice)));
  if (country) conditions.push(eq(properties.country, country));
  if (city) conditions.push(ilike(properties.city, `%${city}%`));
  if (minBedrooms) conditions.push(gte(properties.bedrooms, minBedrooms));

  const where = and(...conditions);

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
propertiesRouter.get("/:id", async (req, res) => {
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
        priceUsd: data.price.toString(), // TODO: convert to USD
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
      priceUsd: updateData.price?.toString(),
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
