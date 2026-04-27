import { Router } from "express";
import { db } from "../db/index";
import { articles, articleContents, users } from "../db/schema";
import { eq, desc, count, and, max } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";

export const articlesRouter = Router();

// Public: list published articles
articlesRouter.get("/", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const status = (req.query.status as string) || undefined;
  const isAdmin = req.session.role === "admin";

  const where = isAdmin && status
    ? eq(articles.status, status as any)
    : isAdmin
    ? undefined
    : eq(articles.status, "published");

  const [articleList, [{ total }]] = await Promise.all([
    db
      .select()
      .from(articles)
      .where(where)
      .orderBy(desc(articles.publishedDate))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(articles).where(where),
  ]);

  // Enrich with current content and author
  const enriched = await Promise.all(
    articleList.map(async (article) => {
      let content = null;
      if (article.currentContentId) {
        [content] = await db
          .select()
          .from(articleContents)
          .where(eq(articleContents.id, article.currentContentId))
          .limit(1);
      }
      const [author] = await db
        .select({ name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, article.authorId))
        .limit(1);
      return { ...article, content, author };
    })
  );

  res.json({ articles: enriched, total, page, totalPages: Math.ceil(total / limit) });
});

// Public: get article by slug
articlesRouter.get("/by-slug/:slug", async (req, res) => {
  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, req.params.slug))
    .limit(1);

  if (!article) return res.status(404).json({ message: "Article not found" });

  let content = null;
  if (article.currentContentId) {
    [content] = await db
      .select()
      .from(articleContents)
      .where(eq(articleContents.id, article.currentContentId))
      .limit(1);
  }

  const [author] = await db
    .select({ name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, article.authorId))
    .limit(1);

  res.json({ ...article, content, author });
});

// Admin: create article
articlesRouter.post("/", requireRole("admin"), async (req, res) => {
  const schema = z.object({
    slug: z.string().min(1),
    category: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    titleEn: z.string().min(1),
    titleFr: z.string().optional(),
    titleEs: z.string().optional(),
    titleAr: z.string().optional(),
    bodyEn: z.string().optional(),
    bodyFr: z.string().optional(),
    bodyEs: z.string().optional(),
    bodyAr: z.string().optional(),
  });

  try {
    const data = schema.parse(req.body);

    const [article] = await db
      .insert(articles)
      .values({
        slug: data.slug,
        authorId: req.session.userId!,
        category: data.category,
        thumbnailUrl: data.thumbnailUrl,
        status: "draft",
      })
      .returning();

    const [content] = await db
      .insert(articleContents)
      .values({
        articleId: article.id,
        version: 1,
        titleEn: data.titleEn,
        titleFr: data.titleFr,
        titleEs: data.titleEs,
        titleAr: data.titleAr,
        bodyEn: data.bodyEn,
        bodyFr: data.bodyFr,
        bodyEs: data.bodyEs,
        bodyAr: data.bodyAr,
      })
      .returning();

    // Set as current content
    await db
      .update(articles)
      .set({ currentContentId: content.id })
      .where(eq(articles.id, article.id));

    res.status(201).json({ ...article, content });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    console.error("Create article error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: update article metadata
articlesRouter.put("/:id", requireRole("admin"), async (req, res) => {
  const schema = z.object({
    slug: z.string().optional(),
    category: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
  });

  try {
    const articleId = req.params.id as string;
    const data = schema.parse(req.body);
    const updateData: any = { ...data };
    if (data.status === "published") {
      updateData.publishedDate = new Date();
    }

    const [updated] = await db
      .update(articles)
      .set(updateData)
      .where(eq(articles.id, articleId))
      .returning();

    if (!updated) return res.status(404).json({ message: "Article not found" });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: create new content version
articlesRouter.post("/:id/content", requireRole("admin"), async (req, res) => {
  const schema = z.object({
    titleEn: z.string().optional(),
    titleFr: z.string().optional(),
    titleEs: z.string().optional(),
    titleAr: z.string().optional(),
    bodyEn: z.string().optional(),
    bodyFr: z.string().optional(),
    bodyEs: z.string().optional(),
    bodyAr: z.string().optional(),
    setAsCurrent: z.boolean().default(false),
  });

  try {
    const articleId = req.params.id as string;
    const data = schema.parse(req.body);

    // Get max version
    const existing = await db
      .select({ version: articleContents.version })
      .from(articleContents)
      .where(eq(articleContents.articleId, articleId))
      .orderBy(desc(articleContents.version))
      .limit(1);

    const nextVersion = (existing[0]?.version || 0) + 1;

    const [content] = await db
      .insert(articleContents)
      .values({
        articleId,
        version: nextVersion,
        titleEn: data.titleEn,
        titleFr: data.titleFr,
        titleEs: data.titleEs,
        titleAr: data.titleAr,
        bodyEn: data.bodyEn,
        bodyFr: data.bodyFr,
        bodyEs: data.bodyEs,
        bodyAr: data.bodyAr,
      })
      .returning();

    if (data.setAsCurrent) {
      await db
        .update(articles)
        .set({ currentContentId: content.id })
        .where(eq(articles.id, articleId));
    }

    res.status(201).json(content);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: delete article
articlesRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  const articleId = req.params.id as string;
  await db.delete(articles).where(eq(articles.id, articleId));
  res.json({ message: "Article deleted" });
});
