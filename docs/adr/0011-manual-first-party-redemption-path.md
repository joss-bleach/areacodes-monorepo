# ADR 0011: Manual first-party redemption path

## Status
Accepted.

## Context
Not every merchant has a provisionable POS (Zettle merchants, no-POS merchants), and even a
Square-connected till can be unavailable. We need a redemption path we fully own that works for anyone,
and it must attribute a redemption to a specific Customer (the only launch path that can, since Square
is aggregate-only — ADR 0009/0010). It also has to suit tech-light independent shops: no staff app
install, no per-employee accounts.

## Decision
Ship a first-party Manual path where **we are the provider**, set up for **every** Business at
onboarding (universal, not a degraded fallback).

Flow: the Customer's Wallet renders the revealed Voucher as a QR encoding a **redemption URL** (carries
voucher + claim identity). A staff member scans it with any device camera, which opens our web
redemption page. On first use that device is unlocked by entering the Business's **Redemption PIN**
once; it stays unlocked until the PIN is rotated. The page validates server-side (active, in window,
not already burned for this Claim, belongs to this Business), shows the offer and a **Redeem/Paid**
button, and the tap burns the Voucher atomically (confirm-then-burn, so staff can abort). The Customer's
phone flips to "Redeemed ✓" (burn is server-side; screenshots are useless). Single-use per Customer is
enforced by a unique idempotency key on `claimId`.

The **Redemption PIN** is an owner-set Business Portal setting (hashed, argon2id), stable until the
owner changes it. Rotating it invalidates every already-unlocked device — this is the
revocation/offboarding mechanism.

## Consequences
- Works for any merchant with zero POS integration and zero staff onboarding beyond one PIN.
- Because the Customer presents their specific Voucher, the code carries campaign identity — with
  several vouchers live at a shop, staff never pick from a list.
- The path is Customer-attributable, powering the per-Customer funnel metrics Square can't.
- It is a lower trust tier: "a present Customer's voucher was marked used by an authorized till," not a
  confirmed transaction. Tagged `trustTier: "manual"` and never conflated with Square (ADR 0010).
- A shared PIN is a static shareable secret. Acceptable while redemptions are **merchant-funded** (a
  loose burn only costs the merchant's own margin). If we ever move to platform/partner-funded
  (cashback), revisit — a live rotating token on the Customer's QR would be needed so a burn requires a
  present Customer, not just PIN knowledge.

## Alternatives considered
- **Customer scans a static store code (Model B).** Zero staff onboarding, but doesn't carry which
  campaign is being redeemed when multiple vouchers are live. Rejected.
- **Per-staff PINs / accounts.** Reintroduces the onboarding we're avoiding; attribution stays
  store-level unless a merchant asks otherwise.
- **Burn-on-scan.** Simplest, but burns before the sale is confirmed. Confirm-then-burn lets staff
  abort a fallen-through sale.
