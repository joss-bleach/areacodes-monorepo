# Voucher Provisioning & Redemption — Implementable Spec (v1)

> Supersedes the exploratory notes in `voucher-abstraction-layer-design.md` where they conflict.
> That doc explored Square-as-Loyalty (customer-bound), Shopify/Clover, and Model A manual.
> This spec reflects the decisions locked in the `/grill-with-docs` session and is what we build.
> Terminology is defined in `/CONTEXT.md` (glossary) — this doc is the how, CONTEXT.md is the what.
> Architecture rationale lives in ADRs 0009 (provision-into-POS + capability), 0010 (unified
> redemptionEvents), 0011 (manual first-party path). ADRs 0001 and 0002 are superseded.

---

## 1. What changed from the original design

Locked pivots the exploratory doc predates:

1. **One system Voucher Code, QR is a rendering.** No business-uploaded barcode/QR artifact. Delete
   the `voucherFormat` axis, `voucherStorageId`, and the format picker. The code is generated at
   Reveal; QR is purely a visual encoding of that same code.
2. **Square path = provisioned `CatalogDiscount` the cashier taps** — NOT a customer-bound Loyalty
   reward, no Square Loyalty subscription. This drops the whole `customer_binding: "required"`
   assumption for Square. Square redemptions are aggregate-per-voucher, no customer identity.
3. **Provider-first creation wizard.** Screen 1 is the target Provider (connected POS(s) + Manual),
   and that choice filters which Discount Kinds are offerable via the Provider's Capability set.
4. **Five structured Discount Kinds** replace freetext-only discounts: `percentage` + `fixed_amount`
   (Square + Manual), `free_item` + `bogof` + `custom` (Manual-only, human-applied).
5. **Unified `redemptionEvents` table** is the single source of truth; `redemptionCount` is derived,
   never a maintained counter.
6. **Manual path is first-class and universal** — every Business gets it at onboarding. Staff scan the
   Customer's Voucher QR → web redemption page → Redemption PIN → confirm-then-burn.
7. **Launch providers are Square + Manual only.** Other POS integrations are NOT built at launch;
   any non-provisionable / no-POS merchant routes to Manual. The port is designed so each new
   provider is purely additive (see the rollout order in §10).
8. **Square reconciliation = webhook + poll backstop** (both), online-only hard-fail.
9. **Square-provisionable Vouchers are customer-visible only once `provisioned`.** Non-blocking create
   with background provisioning + retry, status surfaced to the owner.

---

## 2. Domain model (Convex schema changes)

All money is minor units (pence) + implicit GBP at launch (carry `currency` for forward-compat).

### 2.1 `vouchers` (rewrite)

Remove: `voucherFormat`, `voucherStorageId`, `voucherGenCode`, bare `redemptionCount`.
Add: structured `discount`, `status`, `provisioning`/`providerRefs`.

```ts
vouchers: defineTable({
  businessId: v.id("businesses"),
  userId: v.string(),

  // Presentation (auto-derived from discount at create, owner-overridable)
  title: v.string(),
  description: v.string(),
  terms: v.optional(v.string()),

  // Structured discount (the offer itself)
  discount: v.object({
    kind: v.union(
      v.literal("percentage"),
      v.literal("fixed_amount"),
      v.literal("free_item"),
      v.literal("bogof"),
      v.literal("custom"),
    ),
    // percentage: 0-100
    // fixed_amount: minor units
    value: v.optional(v.number()),
    currency: v.optional(v.string()),   // required for fixed_amount
    itemName: v.optional(v.string()),   // free_item / bogof
    customText: v.optional(v.string()), // custom
  }),

  // Which provider this voucher targets (chosen first in the wizard)
  provider: v.union(v.literal("square"), v.literal("manual")),

  // Provisioning state — only meaningful for provider === "square"
  provisioning: v.object({
    status: v.union(
      v.literal("not_required"), // manual vouchers
      v.literal("pending"),      // create succeeded, push in flight
      v.literal("provisioned"),  // live in the POS -> customer-visible
      v.literal("failed"),       // push failed, retrying / needs attention
    ),
    // Square CatalogDiscount object id, once created
    externalId: v.optional(v.string()),
    lastError: v.optional(v.string()),
    lastAttemptAt: v.optional(v.number()),
    provisionedAt: v.optional(v.number()),
  }),

  voucherValidFrom: v.number(),
  voucherValidTo: v.number(),
  deletedAt: v.optional(v.number()),
  flaggedAt: v.optional(v.number()),
  // NOTE: redemptionCount removed — derived from redemptionEvents.
})
  .index("by_business", ["businessId"])
  .index("by_user", ["userId"])
  .index("by_valid_to", ["voucherValidTo"])
  .index("by_provisioning_status", ["provisioning.status"]) // for retry cron
```

Customer visibility rule (map/wallet queries): a Voucher is listable to Customers iff
`deletedAt == null && flaggedAt == null && now in [validFrom, validTo]` **and**
(`provider === "manual"` OR `provisioning.status === "provisioned"`).

### 2.2 `redemptionEvents` (new — single source of truth)

```ts
redemptionEvents: defineTable({
  voucherId: v.id("vouchers"),
  businessId: v.id("businesses"),
  source: v.union(v.literal("square"), v.literal("manual")),
  trustTier: v.union(v.literal("square"), v.literal("manual")), // == source at launch, kept explicit
  occurredAt: v.number(),   // provider-reported (square) or burn time (manual)
  recordedAt: v.number(),   // when we wrote the row

  // Manual only: who redeemed
  claimId: v.optional(v.id("claims")),
  customerId: v.optional(v.string()),

  // Square only: provider order reference (audit, dedupe)
  providerOrderRef: v.optional(v.string()),
  amountDiscounted: v.optional(v.number()), // minor units, when provider reports it

  // Idempotency: deterministic key, unique per logical redemption
  //   manual: `manual:${claimId}`
  //   square: `square:${orderId}:${catalogDiscountId}`
  idempotencyKey: v.string(),
})
  .index("by_voucher", ["voucherId"])
  .index("by_business", ["businessId"])
  .index("by_idempotency", ["idempotencyKey"]) // enforce uniqueness on insert
```

`redemptionCount(voucher)` = `count(redemptionEvents by_voucher)`. Aggregate for dashboards can be
maintained as a denormalized counter later if read volume demands, but the events table is canonical.

### 2.3 `posConnections` (rewrite — OAuth, encrypted tokens, health)

```ts
posConnections: defineTable({
  businessId: v.id("businesses"),
  provider: v.literal("square"), // manual is not a connection; zettle deferred
  status: v.union(
    v.literal("connected"),
    v.literal("expired"),
    v.literal("revoked"),
  ),
  externalMerchantId: v.string(), // Square merchant_id — webhook routing key
  scopes: v.array(v.string()),

  // AES-256-GCM encrypted token blob (decrypted only in internalActions).
  // Includes access token, refresh token, expiry. Never logged, never returned to client.
  encryptedTokens: v.string(),
  encryptionKeyVersion: v.number(), // for key rotation

  connectedAt: v.number(),
  tokenExpiresAt: v.optional(v.number()), // drives refresh cron
  lastReconciledAt: v.optional(v.number()),
})
  .index("by_business", ["businessId"])
  .index("by_external_merchant", ["externalMerchantId"]) // webhook -> connection
```

### 2.4 `reveals` (minor change)

`reveals.redeemedAt` was never written by any code (confirmed). Redemption truth now lives in
`redemptionEvents`. Keep `reveals` as the code-generation/expiry record; drop `redeemedAt` (a reveal's
redeemed-ness is `exists(redemptionEvent where claimId == reveal.claimId)`).

### 2.5 `businesses` — Redemption PIN

Store the PIN hashed, not on the business row in plaintext. Add:

```ts
// on businesses, or a dedicated redemptionAuth table keyed by businessId:
redemptionPinHash: v.optional(v.string()),   // argon2id
redemptionPinSetAt: v.optional(v.number()),  // rotating this revokes unlocked devices
```

Recommend a dedicated `redemptionAuth` table (keyed `by_business`) so the hash never rides along in
generic business reads. Rotating `redemptionPinSetAt` is the revocation mechanism (see §6).

---

## 3. Capability model (in `@areacodes/domain`)

Core logic and the wizard branch on capabilities, **never** on provider name.

```ts
type DiscountKind = "percentage" | "fixed_amount" | "free_item" | "bogof" | "custom";

interface ProviderCapabilities {
  readonly provider: "square" | "manual";
  readonly provisionableKinds: readonly DiscountKind[]; // wizard offers only these
  readonly attributesToCustomer: boolean;               // manual: true, square: false
  readonly presentation: "audit_code_only" | "redemption_url"; // how the code renders in wallet
  readonly reconciliation: "webhook_poll" | "first_party_burn";
}

const CAPABILITIES: Record<"square" | "manual", ProviderCapabilities> = {
  square: {
    provider: "square",
    provisionableKinds: ["percentage", "fixed_amount"],
    attributesToCustomer: false,
    presentation: "audit_code_only",
    reconciliation: "webhook_poll",
  },
  manual: {
    provider: "manual",
    provisionableKinds: ["percentage", "fixed_amount", "free_item", "bogof", "custom"],
    attributesToCustomer: true,
    presentation: "redemption_url",
    reconciliation: "first_party_burn",
  },
};
```

`presentation` drives what the Customer's wallet encodes in the QR:
- **manual** (`redemption_url`): QR encodes a URL to our staff redemption page carrying the voucher/claim
  identity, so a staff scan opens the burn surface directly.
- **square** (`audit_code_only`): QR encodes just the Voucher Code as text (visual/audit only — the
  cashier taps the pre-provisioned discount; nothing machine-reads this code).

Adding a provider = add a capability entry + an adapter (§7). Zero core branching changes.

---

## 4. Creation wizard (business portal)

Provider-first, capability-filtered. Replaces the current flat voucher form + format picker.

**Screen 1 — Where does this run?**
Options = the Business's connected POS providers (Square, if a healthy `posConnection` exists) + Manual
(always present). If Manual is the only option, skip this screen (implicit Manual).

**Screen 2 — Discount Kind.**
Show only `CAPABILITIES[provider].provisionableKinds`. Square shows percentage + fixed_amount; Manual
shows all five. Selecting the kind reveals its minimal fields:
- `percentage`: value (0-100)
- `fixed_amount`: value (pence) + currency
- `free_item`: itemName
- `bogof`: itemName
- `custom`: customText (free description)

**Screen 3 — Details & window.**
Title + description auto-derived from the discount (e.g. "20% off", "Free flat white"), owner-overridable.
Terms optional. Validity window (from/to).

**Screen 4 — Review & create.**
On submit:
- Manual voucher: `provisioning.status = "not_required"`, immediately customer-visible.
- Square voucher: created with `provisioning.status = "pending"`, NOT yet customer-visible; a background
  job pushes the CatalogDiscount (§5). Owner sees a "Publishing to Square…" status that flips to
  "Live" on success or "Needs attention" on failure (with retry).

---

## 5. Square provisioning & reconciliation

### 5.1 Connection (OAuth)
Self-serve Connect button in the portal (staff-guided during Pilot). Flow from owner POV: click Connect
→ Square's hosted login → Allow → done. We never see their Square password.
- Scopes (minimal): `ITEMS_READ`, `ITEMS_WRITE`, `ORDERS_READ`, `MERCHANT_PROFILE_READ`.
- Store tokens AES-256-GCM encrypted (`encryptedTokens` + `encryptionKeyVersion`); decrypt only inside
  `internalAction`s. Never return tokens to the client or log them.
- Health states: `connected | expired | revoked`. A refresh cron renews access tokens before expiry;
  on revoke/expiry surface a re-auth prompt. Disconnect deprovisions (see §5.4).

### 5.2 Provisioning (create)
Background `internalAction` (triggered on Square voucher create, retried by cron on `pending`/`failed`):
- Create ONE `CatalogDiscount` per voucher via Catalog API.
  - `name`: `"Areacodes: <title>"` (e.g. "Areacodes: 20% off").
  - `percentage` or `amount_money` per discount kind.
  - `present_at_all_locations: true`.
  - `pin_required: false` (frictionless cashier tap — locked decision).
- Store returned `catalog_object_id` → `provisioning.externalId`, set `status = "provisioned"`,
  `provisionedAt`. On failure: `status = "failed"`, `lastError`, `lastAttemptAt`; cron retries with
  backoff. Online-only: hard-fail (no offline queue) — surfaced to owner.

### 5.3 Reconciliation (redemptions back)
Both paths, converging via idempotency:
- **Webhook (fast path):** subscribe to `order.updated` / `payment.updated`. Verify
  `x-square-hmacsha256-signature`. Route to the Business by `merchant_id` → `externalMerchantId`. For
  each paid order carrying one of our `catalog_object_id`s, upsert a `redemptionEvent` with
  `idempotencyKey = square:${orderId}:${catalogDiscountId}`, `source/trustTier = "square"`,
  `providerOrderRef = orderId`, `amountDiscounted` when present. Extract-and-discard raw payloads.
- **Poll (backstop):** cron `searchOrders` since `lastReconciledAt` per connection, same upsert +
  idempotency. Guarantees convergence if a webhook is missed/out-of-order/duplicated.

Square redemptions are aggregate-per-voucher — **no** `customerId`/`claimId`. Never attribute a Square
event to a Customer.

### 5.4 Deprovision
On disconnect or voucher delete: delete the `CatalogDiscount` from Square (best-effort), mark voucher
provisioning cleared. Disconnect sets connection `revoked` and removes encrypted tokens.

---

## 6. Manual redemption path (first-party)

Universal — set up for every Business at onboarding. This is the ONLY launch path that attributes a
Redemption to a specific Customer.

### 6.1 Redemption PIN
Owner sets/changes a Redemption PIN in the Business Portal (a stable setting, not a time window).
Stored hashed (argon2id). It gates the Manual burn surface. Rotating the PIN (`redemptionPinSetAt`
changes) invalidates every already-unlocked device — this is the revocation/offboarding mechanism.

### 6.2 Burn flow (E2E)
1. Customer opens the saved Voucher in their Wallet → Reveal generates the Voucher Code → wallet shows
   a QR encoding the manual **redemption URL** (carries voucher + claim identity).
2. Staff scan the QR with any device camera → opens our web redemption page.
3. First use on that device: enter the Redemption PIN once → device holds an unlocked session (until
   PIN rotation). Subsequent scans skip straight to step 4.
4. Page validates server-side: voucher active, in window, not already burned for this Claim, belongs to
   this Business. Shows the offer ("Apply £5 off" / "Free flat white") and a big **"Paid / Redeem"**
   button.
5. Staff tap Redeem → server burns atomically: insert `redemptionEvent`
   (`idempotencyKey = manual:${claimId}`, `source/trustTier = "manual"`, `claimId`, `customerId`,
   `occurredAt = now`). Single-use per Customer — the unique idempotency key on `claimId` enforces it.
6. Customer's phone flips to "Redeemed ✓" and greys out (burn is server-side, screenshots useless).

Confirm-then-burn (not burn-on-scan): the Redeem tap is the burn, so staff can abort before committing.

### 6.3 Trust tier
Manual events evidence "a present Customer's voucher was marked used by an authorized till," not a
confirmed transaction. Tagged `trustTier: "manual"`. Analytics MUST NOT conflate manual and square
tiers.

---

## 7. Domain layer shape (`@areacodes/domain`)

Replace the Model-A `pos-gateway.ts` machinery (regex `extractVoucherCodes`, `mapSquareOrders`
counting, `pollZettle*`). New shape:

- `capabilities.ts` — the `ProviderCapabilities` table (§3), pure data.
- `provisioning/` — `SquareProvisioner` service (`Context.Tag`): `createCatalogDiscount`,
  `deleteCatalogDiscount`; typed errors `ProvisionError`, `AuthError`, `RateLimited`.
- `reconciliation/` — `mapSquareOrderToRedemptions(order): RedemptionEvent[]` (pure, matches our
  `catalog_object_id`s, derives idempotency key) + `verifySquareWebhook(headers, rawBody)` (HMAC).
- `manual/` — `deriveManualIdempotencyKey(claimId)`, burn validation predicate (pure).
- Keep the Effect-TS idioms (services as `Context.Tag`, `Layer`s, `Data.TaggedError`, `Schema`,
  `Effect.retry`/`Schedule`). Concrete HTTP clients live in the `R` channel, supplied by Convex actions.

The port stays provider-agnostic (registry keyed by provider) so Zettle/Shopify/Clover remain additive.

---

## 8. Testing strategy (locked)

Split by speed so CI stays fast and reliable while the money-adjacent round-trip is regression-covered:

- **Every PR (fast, gates merge):** pure unit tests on the logic — order→`redemptionEvent` mappers,
  idempotency-key derivation, capability routing, discount→CatalogDiscount shaping, manual burn
  validation — using recorded Square response fixtures. No network, milliseconds, zero flakiness.
- **Nightly / on-demand (credential-gated, out of the dev loop):** real Square **sandbox** round-trip —
  provision a CatalogDiscount, create an order carrying it, assert reconciliation, verify a webhook
  signature. Catches integration drift; never blocks a PR.
- **Manual path:** fully E2E testable (no external POS) — cover end-to-end.
- **Physical cashier tap:** not sandbox-testable. Validated by a real-device smoke test at each Pilot
  store's onboarding.

---

## 9. Migration & cleanup checklist

Delete / replace:
- `apps/business/app/components/voucher/voucher-format-picker.tsx` (deleted).
- `voucherFormat`, `voucherStorageId`, `voucherGenCode` from schema + all readers.
- `pos-gateway.ts` Model-A machinery (`extractVoucherCodes`, `mapSquareOrders` counting,
  `pollSquareRedemptions`/`pollZettleRedemptions`, `mapZettlePurchases`, `makeZettleLayer`).
- `posConnections.upsertRedemptionCounts` (voucherCode→reveal→claim→voucher increment) and
  `runRedemptionPolling` as written.
- `posConnections.connectPosProvider` storing `JSON.stringify({apiKey})` → OAuth flow.
- `reveals.redeemedAt`.

Add:
- `redemptionEvents` table + queries; derived `redemptionCount`.
- Structured `discount` + `provisioning` on `vouchers`.
- OAuth connection subsystem + encrypted token storage.
- Square provisioner + webhook receiver + reconciliation cron.
- Manual redemption page + Redemption PIN setting + till-session unlock.
- Provider-first creation wizard.

---

## 10. POS provider rollout order

Each provider is an additive adapter behind the frozen port (§7); this is the sequence, not a
commitment to build all of them. Manual is universal throughout and is the fallback for any provider
not yet built.

**Pilot (build now):**
1. **Square** — natively provisioned `CatalogDiscount` (this spec).
2. **Shopify POS** — native discount code, POS 11.5+ QR scan.
3. **Epos Now** — provisioned discount via their API.

(Plus **Manual** — always on, every business, from day one.)

**Post-Pilot:**
4. **SumUp & Zettle** — in-person voucher redemption; route to Manual until their adapters land.
5. **Lightspeed**.
6. **ICRTouch**.

Sequencing rationale: lead with the providers whose primitives most cleanly match the canonical
`DiscountKind` set (provisionable percentage/fixed-amount), then widen. Providers that can't be
provisioned into keep running on the Manual path in the meantime, so onboarding is never blocked on an
adapter existing.

## 11. UI/UX screens

Ten screens for this flow are designed in the Paper file `Areacodes`
(`https://app.paper.design/file/01KWCYN40197RZ2VMX4B9N2QGX/1-0`) and **exported as committed PNGs** under
[`docs/design/voucher-provisioning/`](design/voucher-provisioning/) (see its `README.md` for the index)
so they are versioned and readable without the design tool, including by headless automation. Paper is
the source of truth; re-export on change.

Coverage: provider-first wizard (steps 1-4), vouchers list with provisioning states (Live / Publishing /
Needs attention), Redemption PIN setting, staff Manual redemption flow (PIN unlock → confirm →
redeemed), and the customer wallet voucher with QR. On-brand: pure black/white, zero radius, Poppins,
Geist Mono for codes, the areacodes pin as the app mark.
