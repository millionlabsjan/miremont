export const ROLES = ["buyer", "agent", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["active", "inactive", "deleted"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PROPERTY_STATUSES = ["active", "inactive", "delisted"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "active",
  "past_due",
  "canceled",
  "trialing",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SIZE_UNITS = ["sqm", "sqft"] as const;
export type SizeUnit = (typeof SIZE_UNITS)[number];

export const MIN_PROPERTY_PRICE_USD = 500_000;
export const STALE_LISTING_DAYS = 30;
