import { Router } from "express";
import { db } from "../db/index";
import { savedSearches } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

export const searchesRouter = Router();

searchesRouter.get("/", requireAuth, async (req, res) => {
  const searches = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, req.session.userId!))
    .orderBy(desc(savedSearches.createdAt));
  res.json(searches);
});

searchesRouter.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().optional(),
    filters: z.object({
      location: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      radius: z.number().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      categories: z.array(z.string()).optional(),
      bedrooms: z.number().optional(),
      bathrooms: z.number().optional(),
      features: z.array(z.string()).optional(),
    }),
  });

  try {
    const data = schema.parse(req.body);
    const [search] = await db
      .insert(savedSearches)
      .values({
        userId: req.session.userId!,
        name: data.name,
        filters: data.filters,
        minPriceUsd: typeof data.filters.minPrice === "number" ? String(data.filters.minPrice) : null,
        maxPriceUsd: typeof data.filters.maxPrice === "number" ? String(data.filters.maxPrice) : null,
        bedroomsMin: typeof data.filters.bedrooms === "number" ? data.filters.bedrooms : null,
      })
      .returning();
    res.status(201).json(search);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal server error" });
  }
});

searchesRouter.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(savedSearches).where(eq(savedSearches.id, req.params.id));
  res.json({ message: "Search deleted" });
});
