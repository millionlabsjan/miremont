# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Database**: PostgreSQL (Replit-managed; `DATABASE_URL` + `PG*` env vars set)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)

## Artifacts

The codebase is the **Miremont / The Property Catalogue** luxury real estate marketplace, imported from https://github.com/millionlabsjan/miremont.

- `artifacts/web` — `kind="web"`, `router="path"`, mounted at `/`. Express + Vite (single port) on port 5000. Dev: `tsx server/index.ts` (Express runs Vite in middleware mode in dev; serves `dist/public` in prod). API routes under `/api/*`, WebSocket at `/ws`. Drizzle ORM against `DATABASE_URL`.
- `artifacts/mobile` — `kind="mobile"`, `router="expo-domain"`. Expo Router app. Dev script wraps `expo start` with the Replit env vars Expo Go needs (`EXPO_PACKAGER_PROXY_URL`, `REACT_NATIVE_PACKAGER_HOSTNAME`, etc.).

Both artifacts share the single Replit Postgres instance via `DATABASE_URL`. Schema is at `artifacts/web/server/db/schema.ts`; push with `pnpm --filter @workspace/web run db:push`.

## Required secrets

These need real values for full functionality (placeholders set so the server can boot):

- `POSTMARK_API_TOKEN` — Postmark server token; needed for password-reset emails.
- `SESSION_SECRET` — already set; used to sign Express sessions.
- `GOOGLE_MAPS_KEY` — referenced literally in `mobile/app.json` for `react-native-maps`; replace before mobile production builds.
- (Optional) `STRIPE_SECRET_KEY`, etc. for payment routes.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/web run db:push` — push Drizzle schema changes to Postgres (dev only)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
