import { Router } from "express";
import { db } from "../db/index";
import { notifications } from "../db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const [notifList, [{ total }], [{ unread }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.session.userId!))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(notifications)
      .where(eq(notifications.userId, req.session.userId!)),
    db
      .select({ unread: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.session.userId!),
          eq(notifications.isRead, false)
        )
      ),
  ]);

  res.json({ notifications: notifList, total, unread, page });
});

notificationsRouter.put("/:id/read", requireAuth, async (req, res) => {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, req.params.id),
        eq(notifications.userId, req.session.userId!)
      )
    );
  res.json({ message: "Marked as read" });
});

notificationsRouter.put("/read-all", requireAuth, async (req, res) => {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, req.session.userId!));
  res.json({ message: "All marked as read" });
});
