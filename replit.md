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
- `GOOGLE_MAPS_API_KEY` — Google Maps API key (with Maps SDK for iOS and Android enabled). Read by `artifacts/mobile/app.config.js` and injected into `ios.config.googleMapsApiKey` and `android.config.googleMaps.apiKey` for `react-native-maps`. Required for tiles to render in built mobile binaries; the config throws during EAS/CI builds if missing. For EAS cloud builds, also register the value as an EAS secret (`eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value <key>`).
- (Optional) `STRIPE_SECRET_KEY`, etc. for payment routes.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/web run db:push` — push Drizzle schema changes to Postgres (dev only)

## Replit edge proxy gotcha (mobile asset URLs)

The Replit edge proxy detects iOS Expo's `CFNetwork`/`Darwin` user-agent and routes any request whose path is **not** prefixed with `/api/` to the mobile dev server, even on the web subdomain. The Expo dev server then serves its SPA index.html (~1435 bytes of `<!DOCTYPE html>… <style id="expo-reset">…`) for unknown paths, so the web Express server never sees those requests on iOS.

Practical impact: any binary asset the mobile app needs to fetch from the web backend (chat photos, avatars, exports, etc.) **must** be served from a path beginning with `/api/`. Otherwise iOS shows a grey placeholder and you'll see `Error decoding image data <NSData …; 1435 bytes>` in the Expo log.

For chat photos, the **server is the source of truth** — `uploadImage()` in `artifacts/web/server/storage/{replit,disk}.ts` returns URLs already prefixed `/api/uploads/chat/...`, and the bucket-proxy handler in `artifacts/web/server/index.ts` is registered at both `/api/uploads/chat/:key` (the new canonical path) and `/uploads/chat/:key` (kept so legacy DB rows still resolve in the web client). `resolveAttachmentUrl` in `artifacts/mobile/app/chat/[id].tsx` keeps the `/uploads/chat/...` → `/api/uploads/chat/...` rewrite as a defence-in-depth fallback for legacy rows on iOS. Apply the same pattern (server hands out `/api/...` URLs from the start) to any future binary endpoint mobile consumes.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
