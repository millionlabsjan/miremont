import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["buyer", "agent", "admin"]);
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "deleted",
]);
export const propertyStatusEnum = pgEnum("property_status", [
  "active",
  "inactive",
  "delisted",
]);
export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "published",
  "archived",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "trialing",
]);
export const sizeUnitEnum = pgEnum("size_unit", ["sqm", "sqft"]);
export const inquiryStatusEnum = pgEnum("inquiry_status", ["open", "closed"]);

// Users
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash"),
    name: varchar("name", { length: 255 }).notNull(),
    avatarUrl: text("avatar_url"),
    role: roleEnum("role").notNull().default("buyer"),
    agencyName: varchar("agency_name", { length: 255 }),
    contactInfo: text("contact_info"),
    googleId: varchar("google_id", { length: 255 }).unique(),
    status: userStatusEnum("status").notNull().default("active"),
    preferredLanguage: varchar("preferred_language", { length: 5 }).default(
      "en"
    ),
    preferredCurrency: varchar("preferred_currency", { length: 3 }).default(
      "USD"
    ),
    notificationPrefs: jsonb("notification_prefs").$type<{
      newRegistrations?: boolean;
      flaggedAccounts?: boolean;
      failedPayments?: boolean;
      staleListings?: boolean;
      systemErrors?: boolean;
    }>(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("users_email_idx").on(t.email)]
);

// Sessions
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

// Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  listingSlots: integer("listing_slots").notNull(),
  priceUsd: decimal("price_usd", { precision: 10, scale: 2 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  features: jsonb("features").$type<Record<string, boolean>>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  isCustom: boolean("is_custom").default(false),
  customPlanName: varchar("custom_plan_name", { length: 100 }),
  listingSlotsOverride: integer("listing_slots_override"),
  featuresOverride: jsonb("features_override").$type<Record<string, boolean>>(),
  internalNotes: text("internal_notes"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Categories
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  parentId: uuid("parent_id"),
});

// Properties
export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    address: text("address"),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 100 }),
    price: decimal("price", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD"),
    priceUsd: decimal("price_usd", { precision: 15, scale: 2 }),
    size: decimal("size", { precision: 10, scale: 2 }),
    sizeUnit: sizeUnitEnum("size_unit").default("sqm"),
    bedrooms: integer("bedrooms"),
    bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
    yearBuilt: integer("year_built"),
    features: jsonb("features").$type<string[]>(),
    images: jsonb("images").$type<string[]>(),
    status: propertyStatusEnum("status").notNull().default("active"),
    listedDate: timestamp("listed_date").defaultNow(),
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("properties_status_price_idx").on(t.status, t.priceUsd),
    index("properties_user_idx").on(t.userId),
    index("properties_location_idx").on(t.latitude, t.longitude),
    index("properties_stale_idx").on(t.status, t.lastUpdated),
  ]
);

// Property Categories (join table)
export const propertyCategories = pgTable(
  "property_categories",
  {
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.propertyId, t.categoryId] })]
);

// Favorites
export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.propertyId] })]
);

// Saved Searches
export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }),
  filters: jsonb("filters").$type<{
    location?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
    categories?: string[];
    bedrooms?: number;
    bathrooms?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inquiries (conversation containers)
export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: inquiryStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("inquiry_unique_idx").on(t.propertyId, t.buyerId)]
);

// Messages
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    attachments: jsonb("attachments").$type<string[]>(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("messages_inquiry_idx").on(t.inquiryId, t.createdAt)]
);

// Articles
export const articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  thumbnailUrl: text("thumbnail_url"),
  category: varchar("category", { length: 100 }),
  status: articleStatusEnum("status").notNull().default("draft"),
  currentContentId: uuid("current_content_id"),
  publishedDate: timestamp("published_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Article Contents (versioned)
export const articleContents = pgTable("article_contents", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  titleEn: varchar("title_en", { length: 500 }),
  titleFr: varchar("title_fr", { length: 500 }),
  titleEs: varchar("title_es", { length: 500 }),
  titleAr: varchar("title_ar", { length: 500 }),
  bodyEn: text("body_en"),
  bodyFr: text("body_fr"),
  bodyEs: text("body_es"),
  bodyAr: text("body_ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    link: text("link"),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.isRead, t.createdAt)]
);

// Newsletter Subscriptions
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  properties: many(properties),
  favorites: many(favorites),
  savedSearches: many(savedSearches),
  buyerInquiries: many(inquiries, { relationName: "buyer" }),
  agentInquiries: many(inquiries, { relationName: "agent" }),
  notifications: many(notifications),
  subscription: one(userSubscriptions),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  user: one(users, { fields: [properties.userId], references: [users.id] }),
  propertyCategories: many(propertyCategories),
  inquiries: many(inquiries),
  favorites: many(favorites),
}));

export const inquiriesRelations = relations(inquiries, ({ one, many }) => ({
  property: one(properties, {
    fields: [inquiries.propertyId],
    references: [properties.id],
  }),
  buyer: one(users, {
    fields: [inquiries.buyerId],
    references: [users.id],
    relationName: "buyer",
  }),
  agent: one(users, {
    fields: [inquiries.agentId],
    references: [users.id],
    relationName: "agent",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  inquiry: one(inquiries, {
    fields: [messages.inquiryId],
    references: [inquiries.id],
  }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(users, { fields: [articles.authorId], references: [users.id] }),
  contents: many(articleContents),
  currentContent: one(articleContents, {
    fields: [articles.currentContentId],
    references: [articleContents.id],
  }),
}));

export const articleContentsRelations = relations(
  articleContents,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleContents.articleId],
      references: [articles.id],
    }),
  })
);
