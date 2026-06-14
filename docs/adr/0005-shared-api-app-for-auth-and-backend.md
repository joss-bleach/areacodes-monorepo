# ADR 0005: Shared `apps/api` as the auth and backend API layer

## Status
Accepted

## Context
Better Auth requires a single server endpoint that all surfaces authenticate against. The monorepo currently has no shared API layer — three TanStack Start apps (business, map, admin) and one Expo app all consume Convex directly. Mounting Better Auth inside one of the existing product apps would couple auth infrastructure to a product surface and force other apps to call it as an external dependency on a product-owned URL.

Additionally, the POS Gateway polling jobs and any future server-side concerns (webhooks, background processing not suited to Convex) need a home.

## Decision
Add `apps/api` — a Hono app deployed as a Vercel Function — as the shared backend API layer. It hosts:
- Better Auth (all three user pools: Customers, Business Owners, Admins)
- POS Gateway HTTP client logic (scheduled polling is triggered by Convex cron actions, which call `apps/api` endpoints or run directly as Convex actions)

All web apps and the Expo app authenticate against `apps/api`. Convex application data remains the source of truth for domain data; `apps/api` owns identity and session infrastructure only.

## Consequences
- Single auth endpoint — consistent session behaviour across all surfaces
- Clean separation: auth infrastructure is not owned by any product app
- `apps/api` becomes a new deployment dependency — all apps fail if it is down
- Adds a 6th app to the monorepo, increasing CI surface
- Hono on Vercel Functions is serverless — no persistent connections, no state; compatible with Better Auth's session model via Neon Postgres

## Alternatives considered
- **Mount Better Auth in `apps/business`** — simple, but couples auth to a product app; map and mobile apps would have a hard dependency on the business app URL
- **Each app runs its own Better Auth instance** — all pointing at the same Neon DB; avoids the shared app but creates three separate auth surfaces with divergent config and session handling complexity
