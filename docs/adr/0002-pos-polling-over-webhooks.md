# ADR 0002: POS redemption verification via polling, not webhooks

## Status
Accepted

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
