# ADR 0009: Provision vouchers into the POS behind a capability architecture

## Status
Accepted. Supersedes ADR 0001 and (with ADR 0010) ADR 0002.

## Context
The original model matched redemptions after the fact: a code was revealed to the Customer, the cashier
typed/scanned it, and we later found that code in the POS transaction feed by regex. This is fragile
(depends on staff entering our code, depends on the code surviving into the transaction record) and
gave a weak product. Each POS also exposes a different discount primitive with a different redemption
surface, so any code that branches on provider name sprawls quickly.

We also had to decide how much of Square's most specific primitive (customer-bound Loyalty rewards,
which need a paid Loyalty subscription) to bake into the core model.

## Decision
**Provision vouchers INTO the POS** rather than matching codes back out. A Square voucher is pushed to
the merchant's catalog as a `CatalogDiscount` (`present_at_all_locations: true`, `pin_required: false`)
that the cashier taps at the counter. No Square Loyalty subscription, no customer binding.

Structure the system as **canonical domain → capability descriptor → thin per-provider adapter**. Core
logic and the creation wizard branch on a provider's declared **Capabilities** (which Discount Kinds it
can provision, whether it attributes to a Customer, how the code is presented, how it reconciles) and
**never** on the provider's name. Adding a provider is additive: one capability entry + one adapter.

Launch providers are **Square** (natively provisioned) and **Manual** (first-party, ADR 0011). Zettle,
Shopify, and Clover are deferred; Zettle/no-POS merchants route to Manual. The port is designed so they
remain purely additive.

A Square-provisionable Voucher becomes **customer-visible only once `provisioning.status ==
"provisioned"`** — creation is non-blocking with background push + retry, and the owner sees the status.

## Consequences
- Redemption is deterministic: the cashier applies a real discount object we own, and we reconcile the
  actual paid order — no dependence on staff typing our code correctly.
- Square redemptions are aggregate-per-voucher with no Customer identity; per-Customer attribution
  exists only on the Manual path. Analytics must keep the trust tiers separate (ADR 0010).
- No Square Loyalty subscription required, widening the addressable merchant base and dropping the
  customer-binding assumption from the canonical model.
- Core code never contains `if (provider === "square")`; a missing branch is a missing capability flag.
- The physical cashier-tap gesture is not sandbox-testable — validated by a real-device smoke test at
  Pilot onboarding (the rest of the round-trip is sandbox/unit testable).

## Alternatives considered
- **Keep code-matching (original model).** Fragile, weak product, depended on staff behaviour and on
  the code surviving into the transaction feed.
- **Square Loyalty reward (customer-bound).** Requires a paid subscription, binds to a customer
  phone/email, and bakes Square's least-generic primitive into the core. Rejected.
- **Branch on provider name.** Sprawls with every provider; the capability descriptor localizes
  difference to data.
