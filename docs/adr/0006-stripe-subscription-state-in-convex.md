# ADR 0006: Stripe subscription state stored in Convex

## Status
Accepted

## Context
Businesses pay a monthly subscription via Stripe. Subscription state (status, trial end, Stripe customer/subscription IDs, current period end) needs to be readable by the platform to gate features — primarily voucher publishing.

The stack has two storage layers: Neon Postgres (Better Auth — user sessions and identity) and Convex (all application data — businesses, vouchers, etc.). Stripe webhooks arrive at the Hono API app.

## Decision
Subscription state is stored in Convex, not Neon. Stripe webhooks are handled by a Convex HTTP action (hitting `convex.site/stripe/webhook`), which verifies the Stripe signature and runs a Convex mutation to upsert subscription state. The official `get-convex/stripe` component is used as the starting point.

## Consequences
- Feature gating in Convex queries is a simple index lookup — no HTTP roundtrip to Neon
- Subscription status changes propagate to the business app UI in real time via Convex's reactive model
- Hono is not involved in webhook handling — one less hop
- **Known risk**: the `get-convex/stripe` component has a bug (issue #7) where `priceId` is not updated on `customer.subscription.updated`. All webhook handlers must be audited before shipping.
- Idempotency must be enforced manually — Stripe delivers webhooks at-least-once; use the Stripe event ID or subscription ID as the upsert key.

## Alternatives considered
- **Store in Neon** — rejected because Convex functions cannot query Neon directly; every feature gate would require an HTTP call to the Hono API, adding latency and coupling.
