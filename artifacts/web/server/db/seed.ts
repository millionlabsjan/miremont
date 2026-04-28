import { db } from "./index";
import {
  users,
  categories,
  properties,
  propertyCategories,
  articles,
  articleContents,
  subscriptionPlans,
  userSubscriptions,
} from "./schema";
import argon2 from "argon2";
import { eq } from "drizzle-orm";

const PLAN_SEEDS = [
  {
    name: "Custom",
    listingSlots: 0,
    priceUsd: null as string | null,
    isActive: false,
    features: {
      Pool: false,
      "Chat support": false,
      Analytics: false,
      "Priority search": false,
      "Custom branding": false,
      "Team seats": false,
    },
  },
  {
    name: "Basic",
    listingSlots: 5,
    priceUsd: "29.00",
    isActive: true,
    features: {
      Pool: false,
      "Chat support": true,
      Analytics: false,
      "Priority search": false,
      "Custom branding": false,
      "Team seats": false,
    },
  },
  {
    name: "Pro",
    listingSlots: 25,
    priceUsd: "99.00",
    isActive: true,
    features: {
      Pool: true,
      "Chat support": true,
      Analytics: true,
      "Priority search": true,
      "Custom branding": false,
      "Team seats": false,
    },
  },
  {
    name: "Elite",
    listingSlots: 100,
    priceUsd: "299.00",
    isActive: true,
    features: {
      Pool: true,
      "Chat support": true,
      Analytics: true,
      "Priority search": true,
      "Custom branding": true,
      "Team seats": true,
    },
  },
];

async function seed() {
  console.log("Seeding database...");

  // Subscription plans (idempotent: lookup-by-name, insert if missing)
  for (const plan of PLAN_SEEDS) {
    const [existing] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, plan.name))
      .limit(1);
    if (!existing) {
      await db.insert(subscriptionPlans).values(plan);
    }
  }

  // Create admin user
  const adminPassword = await argon2.hash("admin123");
  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@thepropertycatalogue.com",
      passwordHash: adminPassword,
      name: "Miremont Admin",
      role: "admin",
      status: "active",
    })
    .onConflictDoNothing()
    .returning();

  // Create agent user
  const agentPassword = await argon2.hash("agent123");
  const [insertedAgent] = await db
    .insert(users)
    .values({
      email: "emma@luxuryrealty.com",
      passwordHash: agentPassword,
      name: "Emma Rodriguez",
      role: "agent",
      agencyName: "Asset Properties",
      status: "active",
    })
    .onConflictDoNothing()
    .returning();
  const agent = insertedAgent
    ?? (await db.select().from(users).where(eq(users.email, "emma@luxuryrealty.com")).limit(1))[0];
  const agentIsNew = !!insertedAgent;

  // Create buyer user
  const buyerPassword = await argon2.hash("buyer123");
  const [buyer] = await db
    .insert(users)
    .values({
      email: "sophia@example.com",
      passwordHash: buyerPassword,
      name: "Sophia Chen",
      role: "buyer",
      status: "active",
    })
    .onConflictDoNothing()
    .returning();

  // Create categories
  const categoryNames = [
    "Villa",
    "Penthouse",
    "Estate",
    "Apartment",
    "Chateau",
    "Beachfront",
    "Townhouse",
  ];
  const createdCategories = await db
    .insert(categories)
    .values(categoryNames.map((name) => ({ name })))
    .onConflictDoNothing()
    .returning();

  // Give the agent an active starter subscription on the Pro plan, if missing
  if (agent) {
    const [existingSub] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, agent.id))
      .limit(1);
    if (!existingSub) {
      const [proPlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, "Pro"))
        .limit(1);
      if (proPlan) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);
        await db.insert(userSubscriptions).values({
          userId: agent.id,
          planId: proPlan.id,
          status: "active",
          isCustom: false,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        });
      }
    }
  }

  if (!agentIsNew) {
    console.log("Agent already existed; skipped property/article seed.");
    console.log("Seeded plans:", PLAN_SEEDS.map((p) => p.name).join(", "));
    process.exit(0);
  }

  // Create sample properties
  const sampleProperties = [
    {
      title: "Luxurious Penthouse with Terrace",
      description:
        "This exceptional penthouse in Torre Diagonal represents the pinnacle of luxury living in Barcelona. Spanning over 320 square meters, this residence offers breathtaking panoramic views of the city skyline and the Mediterranean Sea.",
      latitude: "41.3874",
      longitude: "2.1686",
      address: "Torre Diagonal, Les Corts",
      city: "Barcelona",
      country: "Spain",
      price: "5800000",
      currency: "GBP",
      priceUsd: "7250000",
      size: "320",
      sizeUnit: "sqm" as const,
      bedrooms: 4,
      bathrooms: "3.5",
      yearBuilt: 2021,
      features: [
        "Panoramic views",
        "Private terrace",
        "Floor-to-ceiling windows",
        "Smart home",
        "Concierge",
        "Fitness center",
      ],
      images: [
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      ],
    },
    {
      title: "Côte d'Azur Villa",
      description:
        "Stunning Mediterranean villa nestled in the hills of Nice with panoramic sea views. Features include a private infinity pool, lush gardens, and direct beach access.",
      latitude: "43.7102",
      longitude: "7.262",
      address: "Mont Boron",
      city: "Nice",
      country: "France",
      price: "8200000",
      currency: "GBP",
      priceUsd: "10250000",
      size: "520",
      sizeUnit: "sqm" as const,
      bedrooms: 6,
      bathrooms: "5",
      features: [
        "Infinity pool",
        "Sea views",
        "Private garden",
        "Wine cellar",
        "Guest house",
      ],
      images: [
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
        "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
      ],
    },
    {
      title: "Mayfair Luxury Residence",
      description:
        "An exquisite residence in the heart of London's most prestigious neighborhood. This property combines Georgian elegance with contemporary luxury.",
      latitude: "51.5074",
      longitude: "-0.1478",
      address: "Grosvenor Square",
      city: "London",
      country: "United Kingdom",
      price: "12500000",
      currency: "GBP",
      priceUsd: "15625000",
      size: "450",
      sizeUnit: "sqm" as const,
      bedrooms: 5,
      bathrooms: "4",
      features: [
        "Period features",
        "Private garden",
        "Staff quarters",
        "Wine cellar",
        "Underground parking",
      ],
      images: [
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
      ],
    },
    {
      title: "Modern Waterfront Apartment",
      description:
        "Sleek waterfront apartment in Battery Park City with stunning Hudson River views. Features high-end finishes and a modern open plan layout.",
      latitude: "40.7128",
      longitude: "-74.016",
      address: "Battery Park City",
      city: "Manhattan",
      country: "United States",
      price: "3200000",
      currency: "GBP",
      priceUsd: "4000000",
      size: "185",
      sizeUnit: "sqm" as const,
      bedrooms: 3,
      bathrooms: "2",
      features: ["River views", "Doorman", "Gym", "Rooftop terrace"],
      images: [
        "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80",
      ],
    },
    {
      title: "Elegant Townhouse",
      description:
        "A beautifully renovated townhouse in the West Village, blending historic charm with modern luxury.",
      latitude: "40.7339",
      longitude: "-74.0026",
      address: "West Village",
      city: "Manhattan",
      country: "United States",
      price: "8500000",
      currency: "GBP",
      priceUsd: "10625000",
      size: "380",
      sizeUnit: "sqm" as const,
      bedrooms: 5,
      bathrooms: "4",
      features: [
        "Private garden",
        "Rooftop deck",
        "Chef's kitchen",
        "Home office",
      ],
      images: [
        "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&q=80",
      ],
    },
  ];

  for (const prop of sampleProperties) {
    const [created] = await db
      .insert(properties)
      .values({
        userId: agent.id,
        ...prop,
      })
      .returning();

    // Assign random categories
    const catIndex = Math.floor(Math.random() * createdCategories.length);
    if (createdCategories[catIndex]) {
      await db.insert(propertyCategories).values({
        propertyId: created.id,
        categoryId: createdCategories[catIndex].id,
      });
    }
  }

  // Create a sample article
  if (admin) {
    const [article] = await db
      .insert(articles)
      .values({
        slug: "future-of-luxury-living",
        authorId: admin.id,
        category: "Luxury Trends",
        status: "published",
        publishedDate: new Date(),
        thumbnailUrl:
          "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
      })
      .returning();

    const [content] = await db
      .insert(articleContents)
      .values({
        articleId: article.id,
        version: 1,
        titleEn:
          "The Future of Luxury Living: Trends Shaping 2026",
        bodyEn: `<p>The luxury real estate market is experiencing unprecedented transformation as we move deeper into 2026. From innovative architectural concepts to cutting-edge smart home technology, high-net-worth individuals are redefining luxury.</p>
<h2>Technology Integration</h2>
<p>Leading architects and developers are responding to unprecedented demand for energy-smart systems, water conservation technologies, and sustainable building practices.</p>
<blockquote>"The modern luxury buyer seeks more than status—they want harmony between sophisticated living and environmental stewardship."</blockquote>
<h2>Investment Perspective</h2>
<p>As we look ahead, the luxury real estate sector evolves to reflect a new generation of buyers' expectations for continued growth and innovation.</p>`,
      })
      .returning();

    await db
      .update(articles)
      .set({ currentContentId: content.id })
      .where(eq(articles.id, article.id));
  }

  console.log("Seed completed!");
  console.log("  Admin: admin@thepropertycatalogue.com / admin123");
  console.log("  Agent: emma@luxuryrealty.com / agent123");
  console.log("  Buyer: sophia@example.com / buyer123");
  console.log("  Plans: " + PLAN_SEEDS.map((p) => p.name).join(", "));
  console.log("  Agent subscription: Pro (active, 30-day period)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
