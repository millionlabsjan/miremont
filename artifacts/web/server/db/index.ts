import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { sendPush } from "../push";
import { getTypeSpec } from "../notifications/types";

const connectionString =
  process.env.DATABASE_URL || "postgresql://Jan@localhost:5432/miremont";

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
export type Database = typeof db;

interface NotifyOptions {
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  /**
   * Email helper invoked only when the type is `transactionalImmediate`.
   * digest-eligible types are emailed by the daily digest cron — do not pass this for them.
   */
  sendEmail?: () => Promise<void>;
}

export async function notify(
  userId: string,
  type: string,
  title: string,
  options: NotifyOptions = {}
) {
  const spec = getTypeSpec(type);

  // Pref-gate (skip if user opted out of this category)
  if (spec.prefKey) {
    const [user] = await db
      .select({ notificationPrefs: schema.users.notificationPrefs })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    const prefs = user?.notificationPrefs as Record<string, boolean> | null;
    if (prefs && prefs[spec.prefKey] === false) return;
  }

  await db.insert(schema.notifications).values({
    userId,
    type,
    category: spec.category,
    title,
    body: options.body,
    link: options.link,
    metadata: options.metadata,
  });

  if (spec.category === "transactionalImmediate" && options.sendEmail) {
    options.sendEmail().catch((err) => {
      console.warn(`Failed to send transactional email for ${type}:`, err);
    });
  }

  if (spec.defaultPush) {
    sendPush(userId, {
      title,
      body: options.body,
      data: { type, link: options.link },
    }).catch((err) => {
      console.warn(`Failed to send push for ${type}:`, err);
    });
  }
}
