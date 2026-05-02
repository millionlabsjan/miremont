export type NotificationCategory =
  | "transactionalImmediate"
  | "digestEligible"
  | "realtimeOnly";

export interface NotificationTypeSpec {
  category: NotificationCategory;
  /** Key in users.notificationPrefs that gates this type. Omit for types that ignore prefs (transactional, admin). */
  prefKey?: string;
  /** Whether to send a device push by default. Transactional types skip push. */
  defaultPush: boolean;
}

export const TYPE_REGISTRY: Record<string, NotificationTypeSpec> = {
  // Initial buyer→agent contact — bell + push, deferred email via daily digest.
  // In-thread chat replies are intentionally NOT here: the chat tab has its own
  // unread badge and the WebSocket delivers replies in real time, so a bell
  // entry would duplicate that signal.
  new_inquiry: { category: "digestEligible", prefKey: "inquiryReplies", defaultPush: true },

  // Property changes against favorited listings
  property_update: { category: "digestEligible", prefKey: "propertyUpdates", defaultPush: true },
  price_drop: { category: "digestEligible", prefKey: "propertyUpdates", defaultPush: true },

  // Real-time saved-search matches
  saved_search_match: { category: "digestEligible", prefKey: "savedSearches", defaultPush: true },

  // Admin-only events — bell only, never email
  new_user: { category: "realtimeOnly", defaultPush: false },
  new_property: { category: "realtimeOnly", defaultPush: false },

  // Transactional — emails immediately, no digest, no push
  password_reset: { category: "transactionalImmediate", defaultPush: false },
  plan_assigned: { category: "transactionalImmediate", defaultPush: false },
  plan_removed: { category: "transactionalImmediate", defaultPush: false },
};

export function getTypeSpec(type: string): NotificationTypeSpec {
  return TYPE_REGISTRY[type] ?? { category: "realtimeOnly", defaultPush: true };
}
