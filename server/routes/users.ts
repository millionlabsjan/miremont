import { Router } from "express";
import { db } from "../db/index";
import { users, userSubscriptions, subscriptionPlans, properties } from "../db/schema";
import { eq, ilike, and, or, sql, desc, count, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";
import argon2 from "argon2";

export const usersRouter = Router();

// Get own profile
usersRouter.get("/profile", requireAuth, async (req, res) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.session.userId!))
    .limit(1);
  if (!user) return res.status(404).json({ message: "User not found" });
  const { passwordHash, ...profile } = user;
  res.json(profile);
});

// Update own profile
usersRouter.put("/profile", requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    agencyName: z.string().optional(),
    contactInfo: z.string().optional(),
    preferredLanguage: z.string().optional(),
    preferredCurrency: z.string().optional(),
    notificationPrefs: z.record(z.boolean()).optional(),
  });

  try {
    const data = schema.parse(req.body);
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, req.session.userId!))
      .returning();
    const { passwordHash, ...profile } = updated;
    res.json(profile);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal server error" });
  }
});

// Change password
usersRouter.put("/password", requireAuth, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
  });

  try {
    const data = schema.parse(req.body);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId!))
      .limit(1);

    if (!user?.passwordHash) {
      return res.status(400).json({ message: "Cannot change password for OAuth accounts" });
    }

    const valid = await argon2.verify(user.passwordHash, data.currentPassword);
    if (!valid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const newHash = await argon2.hash(data.newPassword);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, req.session.userId!));

    res.json({ message: "Password updated" });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: list all users (paginated, filterable)
usersRouter.get("/", requireRole("admin"), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || "";
  const role = req.query.role as string;
  const status = req.query.status as string;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    );
  }
  if (role) conditions.push(eq(users.role, role as any));
  if (status) conditions.push(eq(users.status, status as any));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [userList, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        agencyName: users.agencyName,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(where),
  ]);

  // Get listing counts for agents
  const userIds = userList.filter((u) => u.role === "agent").map((u) => u.id);
  const listingCounts: Record<string, number> = {};
  if (userIds.length > 0) {
    const counts = await db
      .select({
        userId: properties.userId,
        count: count(),
      })
      .from(properties)
      .where(
        and(
          eq(properties.status, "active"),
          inArray(properties.userId, userIds)
        )
      )
      .groupBy(properties.userId);
    for (const c of counts) {
      listingCounts[c.userId] = c.count;
    }
  }

  res.json({
    users: userList.map((u) => ({
      ...u,
      listings: listingCounts[u.id] || 0,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// Admin: update user status
usersRouter.put("/:id/status", requireRole("admin"), async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["active", "inactive", "deleted"]) })
    .parse(req.body);

  const [updated] = await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, req.params.id))
    .returning();

  if (!updated) return res.status(404).json({ message: "User not found" });
  res.json({ id: updated.id, status: updated.status });
});

// Admin: assign custom subscription
usersRouter.put("/:id/subscription", requireRole("admin"), async (req, res) => {
  const schema = z.object({
    planId: z.string().uuid(),
    listingSlotsOverride: z.number().int().positive().optional(),
  });

  try {
    const data = schema.parse(req.body);

    // Check if user has active Stripe subscription
    const [existing] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, req.params.id))
      .limit(1);

    if (existing?.stripeSubscriptionId) {
      return res.status(400).json({
        message: "User has an active Stripe subscription. Cannot assign custom plan.",
      });
    }

    if (existing) {
      const [updated] = await db
        .update(userSubscriptions)
        .set({
          planId: data.planId,
          isCustom: true,
          listingSlotsOverride: data.listingSlotsOverride,
          status: "active",
        })
        .where(eq(userSubscriptions.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(userSubscriptions)
      .values({
        userId: req.params.id,
        planId: data.planId,
        isCustom: true,
        listingSlotsOverride: data.listingSlotsOverride,
        status: "active",
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal server error" });
  }
});
