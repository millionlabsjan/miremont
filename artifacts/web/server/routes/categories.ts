import { Router } from "express";
import { db } from "../db/index";
import { categories } from "../db/schema";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  const allCategories = await db.select().from(categories);
  res.json(allCategories);
});
