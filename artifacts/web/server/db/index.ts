import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { sendPush } from "../push";

const connectionString =
  process.env.DATABASE_URL || "postgresql://Jan@localhost:5432/miremont";

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
export type Database = typeof db;

// Map notification types to user preference keys
const PREF_MAP: Record<string, string> = {
  property_update: "propertyUpdates",
  new_message: "inquiryReplies",
  saved_search_match: "savedSearches",
};

interface NotifyOptions {
  sendEmail?: () => Promise<void>;
  /** Set false to skip device push (e.g. background digest types that only email). */
  push?: boolean;
}

export async function notify(
  userId: string,
  type: string,
  title: string,
  body?: string,
  link?: string,
  options?: NotifyOptions
) {
  // Check user preferences if this type has a preference key
  const prefKey = PREF_MAP[type];
  if (prefKey) {
    const [user] = await db
      .select({ notificationPrefs: schema.users.notificationPrefs })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const prefs = user?.notificationPrefs as Record<string, boolean> | null;
    // Default to true if preference not explicitly set
    if (prefs && prefs[prefKey] === false) {
      return; // User opted out — skip notification, email, and push
    }
  }

  await db.insert(schema.notifications).values({ userId, type, title, body, link });

  // Send email if provided (fire-and-forget, don't block)
  if (options?.sendEmail) {
    options.sendEmail().catch((err) => {
      console.warn(`Failed to send notification email for ${type}:`, err);
    });
  }

  // Device push (fire-and-forget). Default on; opt out with push: false.
  if (options?.push !== false) {
    sendPush(userId, { title, body, data: { type, link } }).catch((err) => {
      console.warn(`Failed to send push for ${type}:`, err);
    });
  }
}
