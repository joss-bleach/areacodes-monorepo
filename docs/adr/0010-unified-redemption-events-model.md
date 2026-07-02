# ADR 0010: Unified redemptionEvents model, derived count, dual trust tiers

## Status
Accepted. With ADR 0009, supersedes ADR 0002.

## Context
Two redemption shapes coexist: Square (a real, paid POS order carrying our provisioned discount —
aggregate per Voucher, no Customer identity) and Manual (our staff surface burning a specific
Customer's Voucher — per-Customer, but no confirmed transaction behind it). The old code kept a bare
`redemptionCount` integer on the voucher, incremented by a polling job. That conflates the two shapes,
loses per-event provenance, and can't dedupe a redemption that arrives via both a webhook and a poll.

## Decision
One canonical `redemptionEvents` table is the single source of truth. Each event is
source-discriminated (`square` | `manual`), carries a `trustTier`, an `occurredAt`/`recordedAt`, and a
**deterministic `idempotencyKey`** unique per logical redemption:
- Manual: `manual:${claimId}` (also enforces single-use per Customer).
- Square: `square:${orderId}:${catalogDiscountId}`.

`redemptionCount` is **derived** (count of events for the voucher), never a separately maintained
counter. Square events carry `providerOrderRef` and no Customer; Manual events carry `claimId` +
`customerId` and no order. Square reconciliation writes events from **both** a webhook fast path and a
polling backstop; the idempotency key collapses duplicates.

Analytics MUST NOT conflate the two `trustTier`s: Square is a confirmed transaction attributed to the
Voucher; Manual is Customer-attributed but not transaction-confirmed.

## Consequences
- A redemption arriving via webhook and again via reconciliation collapses to one row (unique
  idempotency key), so counts are correct without a fragile increment.
- Per-event provenance is preserved: every count is explainable and auditable.
- Webhook + poll can both run safely; polling is a self-healing backstop, not the primary path.
- Dashboards must present verified (Square) vs self-reported (Manual) distinctly.
- If read volume ever demands it, a denormalized per-voucher counter can be added as a cache — the
  events table stays canonical.

## Alternatives considered
- **Bare `redemptionCount` integer (original).** No provenance, no dedupe, conflates trust tiers.
- **Separate tables per source.** Duplicates the state machine and dashboard aggregation; a single
  discriminated table with nullable per-source fields is simpler and keeps one source of truth.
- **Webhook-only or poll-only.** Webhook-only silently loses missed events; poll-only adds latency and
  was the Zettle-driven compromise (ADR 0002) that no longer applies.
