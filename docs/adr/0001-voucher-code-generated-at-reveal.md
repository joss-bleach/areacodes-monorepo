# ADR 0001: Voucher code generated at reveal, not at claim

## Status
Superseded by ADR 0009 (provision-into-POS + capability architecture).

The reveal-time code generation still holds, but its original rationale ("codes pushed to the
business's system only when genuinely needed") no longer describes the Square path: vouchers are now
provisioned into the POS as a `CatalogDiscount` at creation, and the reveal code is visual/audit only
on Square. The code is machine-matched only on the Manual path. See ADR 0009.

## Context
When a Customer saves a Voucher (Claim), we need to decide when to generate the unique Voucher Code. Options are: at claim time, at reveal time ("Use Now" tap), or statically at voucher creation (shared code).

## Decision
Generate the unique Voucher Code at reveal time — when the Customer taps "Use Now."

## Consequences
- Codes are only generated when a Customer is physically intending to use the voucher, reducing POS pollution (codes pushed to the business's system only when genuinely needed)
- A 2-hour expiry window can be applied from reveal time, preventing screenshot sharing and replay attacks
- Claim and Reveal become distinct trackable events, giving a richer funnel: viewed → claimed → revealed → redeemed
- Aligns with the pattern used by O2 Priority, Vouchercloud/Uniqodo, and Nectar (who moved to dynamic codes in 2025 specifically to combat static-code fraud)

## Alternatives considered
- **At claim time** — simpler, but generates codes for customers who save but never visit. Clutters POS discount lists and creates more fraud surface.
- **Shared code at voucher creation** — lowest complexity, but no per-customer tracking and trivially sharable outside the app.
