import { db } from "../db/index";
import { notifications, users, systemState } from "../db/schema";
import { and, eq, gte, isNull, inArray, sql } from "drizzle-orm";
import { sendDailyDigestEmail, type DigestItem } from "../email";

const LOCK_KEY = "daily_digest";
const STATE_KEY = "last_daily_digest_at";

interface DigestRunResult {
  usersChecked: number;
  emailsSent: number;
  itemsEmailed: number;
}

/**
 * For each user with unread, email-eligible notifications since the last successful run,
 * send one bundled email and stamp emailSentAt on the rows that landed in it.
 *
 * Idempotency:
 *  - Postgres advisory lock prevents two concurrent runs.
 *  - The UPDATE re-asserts `email_sent_at IS NULL` so partial failure cannot double-send.
 *  - `last_daily_digest_at` is only advanced after the loop completes — a missed run picks
 *    up everything since the last success on the next pass.
 */
export async function runDailyDigest(): Promise<DigestRunResult> {
  const lockHeld = await db.execute<{ locked: boolean }>(
    sql`SELECT pg_try_advisory_lock(hashtext(${LOCK_KEY})) AS locked`
  );
  const locked = (lockHeld as unknown as Array<{ locked: boolean }>)[0]?.locked;
  if (!locked) {
    console.log("Daily digest: lock held by another worker — skipping");
    return { usersChecked: 0, emailsSent: 0, itemsEmailed: 0 };
  }

  try {
    const [stateRow] = await db
      .select()
      .from(systemState)
      .where(eq(systemState.key, STATE_KEY))
      .limit(1);
    const lastRunAt = stateRow?.value && typeof (stateRow.value as { at?: string }).at === "string"
      ? new Date((stateRow.value as { at: string }).at)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        link: notifications.link,
        metadata: notifications.metadata,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.isRead, false),
          isNull(notifications.emailSentAt),
          eq(notifications.category, "digestEligible"),
          gte(notifications.createdAt, lastRunAt)
        )
      )
      .orderBy(notifications.userId, notifications.createdAt);

    const byUser = new Map<string, typeof rows>();
    for (const row of rows) {
      const arr = byUser.get(row.userId) || [];
      arr.push(row);
      byUser.set(row.userId, arr);
    }

    const userIds = Array.from(byUser.keys());
    if (userIds.length === 0) {
      await upsertState(new Date());
      return { usersChecked: 0, emailsSent: 0, itemsEmailed: 0 };
    }

    const userRecords = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        notificationPrefs: users.notificationPrefs,
      })
      .from(users)
      .where(inArray(users.id, userIds));
    const userMap = new Map(userRecords.map((u) => [u.id, u]));

    let emailsSent = 0;
    let itemsEmailed = 0;
    let anyFailure = false;

    for (const [userId, items] of byUser.entries()) {
      const user = userMap.get(userId);
      if (!user) continue;
      const prefs = (user.notificationPrefs ?? {}) as { digestEnabled?: boolean };
      if (prefs.digestEnabled === false) continue;

      const digestItems: DigestItem[] = items.map((i) => ({
        type: i.type,
        title: i.title,
        body: i.body,
        link: i.link,
        metadata: i.metadata as Record<string, unknown> | null,
        createdAt: i.createdAt,
      }));

      try {
        await sendDailyDigestEmail(user.email, user.name, digestItems);
        const ids = items.map((i) => i.id);
        await db
          .update(notifications)
          .set({ emailSentAt: new Date() })
          .where(and(inArray(notifications.id, ids), isNull(notifications.emailSentAt)));
        emailsSent++;
        itemsEmailed += items.length;
      } catch (err) {
        anyFailure = true;
        console.warn(`Daily digest email failed for ${user.email}:`, err);
      }
    }

    // Only advance the watermark when every eligible user was processed cleanly.
    // The `email_sent_at IS NULL` predicate prevents rows we DID send from being re-picked,
    // so leaving the watermark in place safely retries only the failed users.
    if (!anyFailure) await upsertState(new Date());
    return { usersChecked: userIds.length, emailsSent, itemsEmailed };
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${LOCK_KEY}))`);
  }
}

async function upsertState(at: Date) {
  await db
    .insert(systemState)
    .values({ key: STATE_KEY, value: { at: at.toISOString() } })
    .onConflictDoUpdate({
      target: systemState.key,
      set: { value: { at: at.toISOString() }, updatedAt: new Date() },
    });
}
