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

- `artifacts/web` — `kind="web"`, `router="path"`, mounted at `/`. Dev: `npm run dev` on port 5000 (Vite placeholder; user will replace with Express+Vite from GitHub).
- `artifacts/mobile` — `kind="mobile"`, `router="expo-domain"`. Dev: `npx expo start` (via `pnpm dev`). QR card visible in preview pane for "Try on device".

Both artifacts share the single Replit Postgres instance via `DATABASE_URL`.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
