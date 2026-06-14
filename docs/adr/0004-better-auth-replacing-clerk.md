# ADR 0004: Better Auth replacing Clerk for all authentication

## Status
Accepted

## Context
Clerk is used for authentication across the business and admin apps. To add Consumer authentication (required for Claim/Reveal per ADR 0003) and extend auth to the Expo mobile app, we need a solution that works unified across web and mobile. Clerk's per-MAU pricing ($0.02 after 10k MAU) creates cost risk as the platform scales toward student audiences, and its Expo SDK is less mature than its web SDK. Dev/prod configuration is also operationally painful.

Better Auth is an open-source, self-hosted, TypeScript-first auth library with an official Expo plugin (`@better-auth/expo`), zero MAU-based pricing, and simple env-var-based dev/prod separation.

## Decision
Replace Clerk with Better Auth across all apps. Better Auth runs as an API handler inside `apps/api` (Hono) — a single auth endpoint shared by all web apps and the Expo app. Auth data (users, sessions, OAuth tokens) is stored in a dedicated Neon Postgres database, separate from Convex application data. Three distinct user pools: Customers (map web + Consumer App), Business Owners (business app), Admins (admin app).

Convex identity is bridged via JWT: Better Auth issues JWTs, Convex validates them against the Better Auth JWKS endpoint configured in `auth.config.ts`.

## Consequences
- No per-MAU cost at any scale
- Users and sessions are owned infrastructure — no vendor lock-in, no migration dependency
- Requires a Neon Postgres database for auth storage (free tier sufficient at this scale)
- **Known risk**: open bug in `@better-auth/expo` where Apple Sign-In hangs in TestFlight/production release builds (issue #7049). Must be resolved before App Store submission.
- Dev/prod separation reduces to a single env var difference (Neon connection string, Better Auth base URL)

## Alternatives considered
- **Keep Clerk** — viable short-term but MAU pricing trajectory is unfavourable for a student-targeted app; Expo SDK maturity is a concern for mobile launch
- **Supabase Auth** — excellent Expo support and 50k MAU free tier, but couples auth to the Supabase ecosystem alongside Convex
- **Firebase Auth** — no self-hosting, Google lock-in, complex Expo setup in bare workflow
- **Convex Auth** — no separate DB needed, but beta-quality mobile support with thin community
