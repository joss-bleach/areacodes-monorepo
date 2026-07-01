# ADR 0002: POS redemption verification via polling, not webhooks

## Status
Superseded by ADR 0009 / ADR 0010.

Two premises changed. (1) Zettle is no longer a launch provider — Zettle and no-POS merchants route to
the Manual first-party path (ADR 0011), so we no longer need a lowest-common-denominator polling model
to accommodate Zettle. (2) Launch is Square + Manual only, and for Square we use **webhook + poll
backstop** (both), not poll-only: webhooks are the fast path, polling reconciles missed/out-of-order/
duplicate deliveries, converging via a deterministic idempotency key. See ADR 0009 and ADR 0010.

## Context
To verify Redemptions we need to know when a Voucher Code was used at a business's POS. The two standard patterns are: webhooks (POS calls us in real-time on each transaction) or polling (we query the POS transaction history on a schedule).

## Decision
Use scheduled polling (daily/weekly) to verify redemptions across all POS providers.

## Consequences
- Zettle by PayPal — the dominant POS in Brighton/South England independents — does not support programmatic discount code creation or reliable redemption webhooks. Polling their Purchase API is the only viable integration path.
- Polling produces the same end state (accurate redemption counts) for the granularity required: businesses and the platform need daily/weekly totals, not real-time counts.
- A single polling architecture works symmetrically across all providers, simplifying the POS Gateway implementation.
- Real-time webhook support can be added later (Square supports it) as a premium-tier enhancement without changing the data model.

## Alternatives considered
- **Webhooks** — Square supports them; Zettle does not. Building two separate integration patterns for the MVP adds complexity without meaningful benefit at the required data granularity.
