import { Router } from "express";
import { db } from "../db/index";
import { users, userSubscriptions, subscriptionPlans, properties } from "../db/schema";
import { notify } from "../db/index";
import { eq, ilike, and, or, sql, desc, count, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";
import argon2 from "argon2";
import { validatePassword } from "../../shared/password";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../../uploads/avatars");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, _file, cb) => {
    const ext = path.extname(_file.originalname) || ".jpg";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

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
    phone: z.string().optional(),
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

// Upload avatar
usersRouter.post("/profile/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded or invalid type" });
  }

  const [currentUser] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, req.session.userId!))
    .limit(1);

  if (currentUser?.avatarUrl?.includes("/uploads/avatars/")) {
    const oldFilename = currentUser.avatarUrl.split("/uploads/avatars/").pop();
    if (oldFilename) {
      fs.unlink(path.join(uploadsDir, oldFilename), () => {});
    }
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const [updated] = await db
    .update(users)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(users.id, req.session.userId!))
    .returning();

  const { passwordHash, ...profile } = updated;
  res.json(profile);
});

// Remove avatar
usersRouter.delete("/profile/avatar", requireAuth, async (req, res) => {
  const [currentUser] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, req.session.userId!))
    .limit(1);

  if (currentUser?.avatarUrl?.includes("/uploads/avatars/")) {
    const filename = currentUser.avatarUrl.split("/uploads/avatars/").pop();
    if (filename) {
      fs.unlink(path.join(uploadsDir, filename), () => {});
    }
  }

  const [updated] = await db
    .update(users)
    .set({ avatarUrl: null, updatedAt: new Date() })
    .where(eq(users.id, req.session.userId!))
    .returning();

  const { passwordHash, ...profile } = updated;
  res.json(profile);
});

// Change password
usersRouter.put("/password", requireAuth, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().superRefine((p, ctx) => {
      const err = validatePassword(p);
      if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
    }),
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
    const now = new Date();
    await db
      .update(users)
      .set({ passwordHash: newHash, passwordChangedAt: now, updatedAt: now })
      .where(eq(users.id, req.session.userId!));

    res.json({ message: "Password updated" });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: platform stats
usersRouter.get("/stats", requireRole("admin"), async (req, res) => {
  const [[{ totalUsers }], [{ activeAgents }], [{ liveListings }]] = await Promise.all([
    db.select({ totalUsers: count() }).from(users),
    db.select({ activeAgents: count() }).from(users).where(and(eq(users.role, "agent"), eq(users.status, "active"))),
    db.select({ liveListings: count() }).from(properties).where(eq(properties.status, "active")),
  ]);
  res.json({ totalUsers, activeAgents, liveListings });
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

// Admin: get user subscription details
usersRouter.get("/:id/subscription", requireRole("admin"), async (req, res) => {
  const [user] = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!user) return res.status(404).json({ message: "User not found" });

  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, req.params.id))
    .limit(1);

  if (!sub) return res.json({ user, subscription: null, plan: null, state: "no_plan" });

  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, sub.planId)).limit(1);

  const state = sub.stripeSubscriptionId ? "stripe" : sub.isCustom ? "custom" : "no_plan";
  res.json({ user, subscription: sub, plan, state });
});

// Admin: assign or update custom subscription
usersRouter.put("/:id/subscription", requireRole("admin"), async (req, res) => {
  const schema = z.object({
    customPlanName: z.string().min(1),
    listingSlots: z.number().int().positive(),
    features: z.record(z.boolean()).optional(),
    planExpiry: z.string().nullable().optional(),
    internalNotes: z.string().nullable().optional(),
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

    // Get or create the base Custom plan
    const [customPlan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, "Custom")).limit(1);
    if (!customPlan) return res.status(500).json({ message: "Base custom plan not found" });

    const values = {
      planId: customPlan.id,
      isCustom: true,
      customPlanName: data.customPlanName,
      listingSlotsOverride: data.listingSlots,
      featuresOverride: data.features || {},
      internalNotes: data.internalNotes || null,
      currentPeriodEnd: data.planExpiry ? new Date(data.planExpiry) : null,
      status: "active" as const,
    };

    if (existing) {
      const [updated] = await db
        .update(userSubscriptions)
        .set(values)
        .where(eq(userSubscriptions.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(userSubscriptions)
      .values({ userId: req.params.id, ...values })
      .returning();

    // Notify the user
    await notify(req.params.id, "plan_assigned", `Custom plan assigned: ${data.customPlanName}`, `You now have ${data.listingSlots} listing slots.`);

    res.status(201).json(created);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    console.error("Subscription error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: remove custom subscription
usersRouter.delete("/:id/subscription", requireRole("admin"), async (req, res) => {
  const [existing] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, req.params.id))
    .limit(1);

  if (!existing) return res.status(404).json({ message: "No subscription found" });
  if (existing.stripeSubscriptionId) {
    return res.status(400).json({ message: "Cannot remove Stripe subscription from admin panel." });
  }

  await db.delete(userSubscriptions).where(eq(userSubscriptions.id, existing.id));
  await notify(req.params.id, "plan_removed", "Custom plan removed", "Your custom plan has been removed by an administrator.");
  res.json({ message: "Subscription removed" });
});

// Admin: list available plans
usersRouter.get("/plans/list", requireRole("admin"), async (req, res) => {
  const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  res.json(plans);
});
