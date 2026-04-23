# Miremont — Luxury Real Estate Marketplace

## Project Overview
Luxury property marketplace connecting estate agents with international buyers. Three user roles: Admin, Agent (estate agency), Buyer (property seeker).

## Target Deployment
Replit (web app + database hosted on Replit)

## Tech Stack
- **Frontend:** React (web-responsive) with TypeScript
- **Backend:** Node.js with Express/Hono
- **Database:** PostgreSQL (Replit-hosted)
- **ORM:** Drizzle ORM
- **Mobile:** React Native (Expo) — future phase
- **Real-time:** WebSockets for chat
- **Payments:** Stripe Subscriptions
- **Maps:** Mapbox or Google Maps
- **i18n:** Multi-language support (4 languages)
- **Auth:** Email/password with password reset

## Key Features (v1/MVP)
- Auth (login, signup, password reset, profile management)
- Property listings with map + list views
- Property search with filters (location, price, categories)
- Chat system between buyers and agents
- Admin dashboard (user management, plan management, articles)
- News/blog with versioned content and multi-language
- Stripe subscription billing for agents
- Currency conversion widget
- Saved searches and property favorites
- Notifications system
- Auto-delist stale properties (30 days without update)

## User Roles
- **Admin:** Full platform management, user/plan management, article CRUD
- **Agent:** Property CRUD, chat with buyers, subscription management, billing
- **Buyer:** Browse/search properties, favorites, saved searches, chat with agents

## Data Entities
- User, Property, Inquiry, Messages, Article, ArticleContent, Categories, Search, Newsletter_subscription

## Scope Document
Full scope available at `docs/scope.pdf`
