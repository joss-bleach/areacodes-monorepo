# ADR 0003: Customer authentication required to claim or reveal a voucher

## Status
Accepted

## Context
The map app currently has no authentication — all consumers are anonymous. To support per-customer claim tracking, unique-code generation, and the claim → reveal → redeemed state machine, we need a Customer identity.

## Decision
Require Customers to create an account (via Clerk) to Claim or Reveal a Voucher. Anonymous browsing of the map and viewing of voucher listings remains permitted.

## Consequences
- Enables per-customer claim history and prevents the same customer gaming the reveal flow
- Clerk is already running on the business and admin apps — adding it to the map app is low infrastructure cost
- Introduces a sign-up gate before redemption, which adds friction vs fully anonymous flow
- Without identity, there is no meaningful way to prevent a single person generating unlimited unique codes, which would pollute POS discount lists

## Alternatives considered
- **Fully anonymous with device fingerprint** — unreliable across devices and browsers; insufficient for preventing code abuse at POS.
- **Anonymous claim, authenticated reveal** — adding a sign-up gate mid-flow (between save and use) is worse UX than gating at the claim step.
