import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index";
import { users, savedSearches } from "../db/schema";
import { findMatches, MatchedProperty } from "../savedSearchMatcher";
import { sendSavedSearchDigestEmail } from "../email";

/**
 * Build a per-user digest of new properties matching saved searches and email it.
 * Each search advances its `lastNotifiedAt` so the next run only considers fresher listings.
 * Honors the `savedSearches` notification preference (defaults to true if unset).
 */
export async function runSavedSearchDigest(): Promise<{
  usersChecked: number;
  emailsSent: number;
}> {
  // Pull all saved searches joined with the owning user (and their email + prefs).
  const rows = await db
    .select({
      searchId: savedSearches.id,
      searchName: savedSearches.name,
      filters: savedSearches.filters,
      lastNotifiedAt: savedSearches.lastNotifiedAt,
      userId: users.id,
      email: users.email,
      notificationPrefs: users.notificationPrefs,
    })
    .from(savedSearches)
    .innerJoin(users, eq(users.id, savedSearches.userId))
    .where(eq(users.status, "active"));

  // Group by user.
  const byUser = new Map<
    string,
    {
      email: string;
      prefs: Record<string, boolean> | null;
      searches: typeof rows;
    }
  >();
  for (const row of rows) {
    const prefs = (row.notificationPrefs as Record<string, boolean> | null) ?? null;
    if (prefs && prefs.savedSearches === false) continue; // user opted out
    if (!byUser.has(row.userId)) {
      byUser.set(row.userId, { email: row.email, prefs, searches: [] });
    }
    byUser.get(row.userId)!.searches.push(row);
  }

  let emailsSent = 0;
  const now = new Date();

  for (const [, bucket] of byUser) {
    // For each saved search, find new matches since lastNotifiedAt (or epoch on first run).
    const sectionsRaw: Array<{
      searchId: string;
      searchName: string;
      matches: MatchedProperty[];
    }> = [];

    for (const s of bucket.searches) {
      const sinceDate = s.lastNotifiedAt ?? new Date(0);
      const matches = await findMatches(
        { id: s.searchId, filters: s.filters },
        sinceDate
      );
      sectionsRaw.push({
        searchId: s.searchId,
        searchName: s.searchName || "Saved search",
        matches,
      });
    }

    // Dedupe properties across multiple searches by ID — a property only shows up once.
    const seen = new Set<string>();
    const sections = sectionsRaw
      .map((sec) => ({
        searchId: sec.searchId,
        searchName: sec.searchName,
        matches: sec.matches.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        }),
      }))
      .filter((sec) => sec.matches.length > 0);

    if (sections.length > 0) {
      try {
        await sendSavedSearchDigestEmail(
          bucket.email,
          sections.map((sec) => ({
            searchName: sec.searchName,
            matches: sec.matches.map((m) => ({
              propertyId: m.id,
              title: m.title,
              city: m.city,
              country: m.country,
              price: m.price,
              currency: m.currency,
              imageUrl: m.images?.[0] ?? null,
            })),
          }))
        );
        emailsSent++;
      } catch (err) {
        console.warn("Failed to send saved-search digest:", err);
        continue; // Don't advance lastNotifiedAt if the email failed.
      }
    }

    // Advance lastNotifiedAt for every search we evaluated for this user, even
    // those with zero matches — otherwise an empty search would re-scan from epoch forever.
    const ids = bucket.searches.map((s) => s.searchId);
    await db
      .update(savedSearches)
      .set({ lastNotifiedAt: now })
      .where(sql`${savedSearches.id} = ANY(${ids})`);
  }

  return { usersChecked: byUser.size, emailsSent };
}

// Allow `tsx server/cron/savedSearchDigest.ts` for manual runs.
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("savedSearchDigest.ts");
if (isMain) {
  runSavedSearchDigest()
    .then((r) => {
      console.log(
        `Saved-search digest done: checked ${r.usersChecked} users, sent ${r.emailsSent} emails`
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error("Saved-search digest failed:", err);
      process.exit(1);
    });
}
