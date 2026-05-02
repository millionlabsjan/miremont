import { db } from "../db/index";
import { notifications, users } from "../db/schema";
import { and, desc, eq, gte, sql, inArray } from "drizzle-orm";
import { sendInactiveSummaryEmail, type DigestItem } from "../email";

const LOCK_KEY = "weekly_inactive_summary";
const INACTIVITY_THRESHOLD_DAYS = 7;
const HIGHLIGHT_LIMIT = 8;

interface RunResult {
  usersChecked: number;
  emailsSent: number;
}

export async function runWeeklyInactiveSummary(): Promise<RunResult> {
  const lockHeld = await db.execute<{ locked: boolean }>(
    sql`SELECT pg_try_advisory_lock(hashtext(${LOCK_KEY})) AS locked`
  );
  const locked = (lockHeld as unknown as Array<{ locked: boolean }>)[0]?.locked;
  if (!locked) {
    console.log("Weekly inactive summary: lock held by another worker — skipping");
    return { usersChecked: 0, emailsSent: 0 };
  }

  try {
    const cutoff = new Date(Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    const inactiveUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        lastLoginAt: users.lastLoginAt,
        notificationPrefs: users.notificationPrefs,
      })
      .from(users)
      .where(and(eq(users.status, "active"), sql`(${users.lastLoginAt} IS NULL OR ${users.lastLoginAt} < ${cutoff.toISOString()})`));

    const eligible = inactiveUsers.filter((u) => {
      const prefs = (u.notificationPrefs ?? {}) as { inactiveSummary?: boolean };
      return prefs.inactiveSummary !== false;
    });

    if (eligible.length === 0) return { usersChecked: inactiveUsers.length, emailsSent: 0 };

    let emailsSent = 0;

    for (const user of eligible) {
      const since = user.lastLoginAt ?? cutoff;
      const items = await db
        .select({
          type: notifications.type,
          title: notifications.title,
          body: notifications.body,
          link: notifications.link,
          metadata: notifications.metadata,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), gte(notifications.createdAt, since)))
        .orderBy(desc(notifications.createdAt))
        .limit(HIGHLIGHT_LIMIT);

      if (items.length === 0) continue;

      const highlights: DigestItem[] = items.map((i) => ({
        type: i.type,
        title: i.title,
        body: i.body,
        link: i.link,
        metadata: i.metadata as Record<string, unknown> | null,
        createdAt: i.createdAt,
      }));

      try {
        await sendInactiveSummaryEmail(user.email, user.name, highlights);
        emailsSent++;
      } catch (err) {
        console.warn(`Weekly inactive summary failed for ${user.email}:`, err);
      }
    }

    return { usersChecked: inactiveUsers.length, emailsSent };
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${LOCK_KEY}))`);
  }
}
