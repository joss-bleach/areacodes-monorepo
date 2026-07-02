# POS Voucher Abstraction Layer — Design Notes & Canonical Contract

> Stack note: implemented in **Effect-TS** (Effect 3.x). The contract below is expressed in Effect idioms — `Effect<A, E, R>`, services as `Context.Tag` implemented by `Layer`s, typed/tagged errors, and `Schema` for validation. See §2.0 for the mapping from plain-TS shapes.

## 1. Context

### Goal
Build a provider-agnostic abstraction layer for vouchers/discounts. Business owners create a voucher through **our** system; it is automatically provisioned into the merchant's POS; redemptions flow back so owners see the data in **our** app. One core architecture, with per-provider business logic isolated behind adapters. Launching with **Square**, rolling out more providers over time.

### The core requirement
1. Voucher created in our system (we are the source of truth).
2. Auto-provisioned into each merchant's POS via that POS's API.
3. Redemptions read back into our app for the merchant-facing dashboard.

### Key finding: there is no shared voucher standard across POS vendors
The data read-back (dashboard) is the *easy*, provider-agnostic half — every major POS emits webhooks/events on redemption. The hard half is "auto-added to the business's system," because each POS exposes a different primitive with a different redemption surface. Per-provider notes:

| Provider | Voucher maps to | In-store redemption | Tracking | Notable caveats |
|---|---|---|---|---|
| **Square** | Loyalty coupon/reward (or order-level discount via Orders API) | Cashier enters code in stock POS (Rewards → Use Code); or auto-apply + auto-redeem when an order ID is passed via Orders API | Loyalty events + webhooks | Merchant needs a **Square Loyalty subscription**; program must be created in the dashboard (API can't create it); the clean in-POS path is **customer/phone-bound** |
| **Shopify POS** | Discount code (native, or via a Discount Functions app) | Code created in admin is auto-available in POS; cashier enters it, or **scans a QR** (POS 11.5+) | Sales-by-discount report + order webhooks | Third-party app discounts **always apply to both online + POS** (no channel restriction); 20M unique-code cap per store |
| **Clover** | Discount applied to an order/line item via REST API | No native "enter third-party code" surface — build a Clover device app, or apply discount via API and reconcile | Order webhooks | Most custom work of the three |

### Architectural decisions reached
- **Pattern:** ports-and-adapters (hexagonal). One canonical domain, thin per-provider adapters.
- **Model differences explicitly, don't hide them.** Avoid both lowest-common-denominator (weak product) and union-of-everything (interface full of "unsupported" holes). Use a **capability descriptor** per provider that both core logic and UI read. Business logic keys off capabilities, not `if provider == "square"`.
- **Three layers, not two:** canonical domain → capability model → thin adapters.
- **Normalize the redemption event best** — it's conceptually identical everywhere and feeds the dashboard.
- **Own the state machine; don't trust webhooks.** Webhooks miss/retry/arrive out of order. Reconciliation (polling) is the correct path; webhooks are the fast path. Idempotency keys + own ledger.
- **Connection management is a first-class subsystem** — per-merchant, per-provider OAuth: token storage, refresh, scope differences, revocation, re-auth.
- **Square-first caution:** Square's voucher primitive is arguably the *least* generic (loyalty, customer-bound, subscription-gated). Risk of baking customer-binding/loyalty assumptions into the canonical model that don't generalize to standalone codes (Shopify's model). Mitigation: build Square concretely, but design the **port** by sketching how Shopify + Clover adapters would satisfy it *before* freezing the interface.

---

## 2. Canonical Contract (Draft v1 — Effect-TS)

Money is always minor units (cents) + currency to avoid float drift.

### 2.0 Effect-TS conventions

| Plain TS | Effect-TS equivalent used below |
|---|---|
| `Promise<A>` / throws | `Effect.Effect<A, E, R>` — typed success, typed error, typed requirements |
| `interface XAdapter` + manual DI | a service `Context.Tag`, implemented by one or more `Layer`s |
| `throw new Error()` | tagged errors (`Data.TaggedError` / `Schema.TaggedError`) carried in the `E` channel |
| zod / hand-rolled validation | `Schema` — one definition is both the static type and the runtime decoder |
| retry/backoff helpers | `Schedule` + `Effect.retry` |
| ad-hoc cron | `Effect.repeat` / `Stream` driven by a `Schedule` |
| jest mocks / DI overrides | test `Layer`s + `@effect/vitest` + `TestClock` |

```ts
import { Effect, Context, Layer, Schema, Data, Schedule, Duration, DateTime, Config } from "effect"
import type { ParseResult } from "effect"
```
(Effect 3.10+ ships `Schema` from the `effect` package; older code imports it from `@effect/schema`.)

**Multi-tenancy note.** A `Context.Tag` resolves to exactly one implementation, so we do **not** provide a single global `PosVoucherAdapter`. Each provider is its own adapter value, and a **registry** service (§2.8) resolves the right one at runtime from the merchant's provider. Per-merchant credentials are resolved through a `ConnectionStore` service (§2.6), never baked into a layer.

### 2.1 Errors (typed, in the `E` channel)

```ts
class ProvisionError extends Data.TaggedError("ProvisionError")<{
  readonly provider: ProviderId
  readonly reason: string
  readonly retryable: boolean
  readonly cause?: unknown
}> {}

class CapabilityViolation extends Data.TaggedError("CapabilityViolation")<{
  readonly provider: ProviderId
  readonly constraint: string        // e.g. "customer_binding_required"
  readonly detail: string
}> {}

class WebhookVerificationError extends Data.TaggedError("WebhookVerificationError")<{
  readonly provider: ProviderId
}> {}

class UnknownProviderError extends Data.TaggedError("UnknownProviderError")<{
  readonly provider: string
}> {}

class AuthError extends Data.TaggedError("AuthError")<{
  readonly provider: ProviderId
  readonly kind: "expired" | "revoked" | "invalid_scope" | "exchange_failed"
}> {}

class RateLimited extends Data.TaggedError("RateLimited")<{
  readonly provider: ProviderId
  readonly retryAfter?: Duration.Duration
}> {}
```
For errors that cross the wire (HTTP/webhook boundary), prefer `Schema.TaggedError` so they serialize/deserialize cleanly. Core code discriminates on `_tag`, never on string matching.

### 2.2 Canonical entities (`Schema` = type + decoder)

```ts
const ProviderId = Schema.Literal("square", "shopify", "clover")
type ProviderId = Schema.Schema.Type<typeof ProviderId>

const Money = Schema.Struct({
  amount: Schema.Int,                 // minor units
  currency: Schema.String             // ISO 4217
})

const ItemSelector = Schema.Struct({
  product_ids: Schema.optional(Schema.Array(Schema.String)),
  category_ids: Schema.optional(Schema.Array(Schema.String))
})

const DiscountSpec = Schema.Struct({
  type: Schema.Literal("percentage", "fixed_amount"),
  value: Schema.Number,               // 0–100 for %, minor units for fixed_amount
  currency: Schema.optional(Schema.String),   // required when type === "fixed_amount"
  scope: Schema.Literal("order", "line_item", "specific_items"),
  applies_to: Schema.optional(ItemSelector)
})

const CustomerRef = Schema.Struct({
  phone: Schema.optional(Schema.String),      // E.164
  email: Schema.optional(Schema.String),
  external_id: Schema.optional(Schema.String)
})

const VoucherConstraints = Schema.Struct({
  valid_from: Schema.optional(Schema.DateTimeUtc),
  valid_until: Schema.optional(Schema.DateTimeUtc),
  max_redemptions: Schema.optional(Schema.Int),
  max_redemptions_per_customer: Schema.optional(Schema.Int),
  min_purchase: Schema.optional(Money),
  channels: Schema.optional(Schema.Array(Schema.Literal("pos", "online"))),
  customer_binding: Schema.optional(CustomerRef)
})

const ProviderRef = Schema.Struct({
  provider: ProviderId,
  external_id: Schema.String,
  external_code: Schema.optional(Schema.String),
  provision_status: Schema.Literal("pending", "active", "failed"),
  location_ids: Schema.optional(Schema.Array(Schema.String)),
  error: Schema.optional(Schema.String),
  last_synced_at: Schema.optional(Schema.DateTimeUtc)
})

const VoucherStatus = Schema.Literal(
  "DRAFT", "ACTIVE", "EXHAUSTED", "EXPIRED", "DEACTIVATED"
)

const Voucher = Schema.Struct({
  id: Schema.String,
  merchant_id: Schema.String,
  status: VoucherStatus,
  code: Schema.NullOr(Schema.String),         // null if purely customer-bound
  discount: DiscountSpec,
  constraints: VoucherConstraints,
  redemption_count: Schema.Int,
  provider_refs: Schema.Array(ProviderRef),
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  created_at: Schema.DateTimeUtc,
  updated_at: Schema.DateTimeUtc
})
type Voucher = Schema.Schema.Type<typeof Voucher>
```

### 2.3 Redemption event — decoded, not hand-parsed

```ts
const RedemptionEvent = Schema.Struct({
  id: Schema.String,                  // deterministic — see idempotency note
  voucher_id: Schema.String,
  merchant_id: Schema.String,
  provider: ProviderId,
  location_id: Schema.optional(Schema.String),
  channel: Schema.Literal("pos", "online", "unknown"),
  amount_discounted: Schema.optional(Money),
  order_ref: Schema.optional(Schema.String),
  customer_ref: Schema.optional(Schema.String),
  occurred_at: Schema.DateTimeUtc,    // provider-reported
  received_at: Schema.DateTimeUtc,    // when we ingested
  source: Schema.Literal("webhook", "reconciliation"),
  raw_ref: Schema.optional(Schema.String)
})
type RedemptionEvent = Schema.Schema.Type<typeof RedemptionEvent>
```
Each adapter defines its own `ProviderWebhookPayload` schema and decodes provider → canonical with `Schema.decodeUnknown`. A malformed payload fails in the typed `ParseError` channel rather than slipping through silently.

**Idempotency:** derive `id` from stable provider fields, e.g. `hash(provider + external_redemption_id)` or `hash(provider + order_ref + voucher_external_id)`. The same redemption arriving via webhook *and* reconciliation must collapse to one row; last-write-wins on enrichment (reconciliation may carry fuller data).

### 2.4 Canonical state machine

```
DRAFT ──provision──▶ ACTIVE ──redeem (single-use)──▶ EXHAUSTED
                       │  └──redeem (multi-use, < max)──▶ ACTIVE (count++)
                       │  └──count reaches max──▶ EXHAUSTED
                       ├──valid_until passes──▶ EXPIRED
                       └──manual──▶ DEACTIVATED
```

Adapters map each provider's native states into this. Reference mapping:

| Canonical | Square (loyalty reward) | Shopify (discount/code) | Clover (order discount) |
|---|---|---|---|
| ACTIVE | ISSUED | active / enabled | discount object exists, unredeemed |
| EXHAUSTED / redeemed | REDEEMED | usage limit hit | applied on a paid order |
| DEACTIVATED | DELETED (pre-redeem) | disabled | deleted/voided |

### 2.5 Capability model (plain data is fine)

Core logic and UI both read this. Validate constraints against the target provider's capabilities at **creation time** — raise `CapabilityViolation` before provisioning, never silently drop a constraint.

```ts
interface ProviderCapabilities {
  readonly provider: ProviderId
  readonly supported_discount_types: ReadonlyArray<"percentage" | "fixed_amount">
  readonly supported_scopes: ReadonlyArray<"order" | "line_item" | "specific_items">
  readonly redemption_model: "native_code" | "customer_bound" | "order_api_only" | "device_app"
  readonly supports_qr_scan: boolean
  readonly can_restrict_channel: boolean
  readonly customer_binding: "required" | "optional" | "unsupported"
  readonly partial_redemption: boolean
  readonly requires_subscription?: string        // e.g. "square_loyalty"
  readonly max_codes?: number                     // e.g. Shopify 20_000_000
  readonly redemption_event_sources: ReadonlyArray<"webhook" | "polling">
}
```

Expected shapes (verify against live docs when building each adapter):

```
square:  redemption_model: "customer_bound", supports_qr_scan: false,
         can_restrict_channel: false, customer_binding: "required",
         requires_subscription: "square_loyalty"

shopify: redemption_model: "native_code", supports_qr_scan: true,
         can_restrict_channel: false, customer_binding: "optional",
         max_codes: 20_000_000

clover:  redemption_model: "order_api_only", supports_qr_scan: false,
         can_restrict_channel: true,  customer_binding: "unsupported"
```

### 2.6 Connection subsystem (a service)

```ts
const MerchantConnection = Schema.Struct({
  id: Schema.String,
  merchant_id: Schema.String,
  provider: ProviderId,
  status: Schema.Literal("connected", "expired", "revoked", "error"),
  external_merchant_id: Schema.String,
  scopes: Schema.Array(Schema.String),
  expires_at: Schema.optional(Schema.DateTimeUtc),
  locations: Schema.Array(Schema.Struct({
    external_id: Schema.String, name: Schema.String, enabled: Schema.Boolean
  }))
  // access/refresh tokens held separately, redacted — never in this struct's logs
})
type MerchantConnection = Schema.Schema.Type<typeof MerchantConnection>

class ConnectionStore extends Context.Tag("ConnectionStore")<
  ConnectionStore,
  {
    readonly get: (merchantId: string, provider: ProviderId) =>
      Effect.Effect<MerchantConnection, AuthError>
    readonly save: (conn: MerchantConnection) => Effect.Effect<void>
  }
>() {}
```
Tokens come from `Config.redacted(...)` so they never print in logs or traces; refresh is an `Effect` wrapped in `Effect.retry`.

### 2.7 The adapter port (Effect service shape)

The shape every provider implements. `Effect` return types make every failure mode explicit and exhaustively handleable.

```ts
interface MerchantContext {
  readonly connection: MerchantConnection
  readonly location_ids?: ReadonlyArray<string>
}

interface PosVoucherAdapter {
  readonly provider: ProviderId
  readonly capabilities: ProviderCapabilities

  readonly createVoucher: (
    ctx: MerchantContext,
    voucher: Voucher
  ) => Effect.Effect<ProviderRef, ProvisionError | CapabilityViolation | AuthError | RateLimited>

  readonly deactivateVoucher: (
    ctx: MerchantContext,
    ref: ProviderRef
  ) => Effect.Effect<void, ProvisionError | AuthError>

  // ingestion
  readonly verifyWebhook: (
    headers: Record<string, string>,
    rawBody: string
  ) => Effect.Effect<boolean, WebhookVerificationError>

  readonly normalizeWebhook: (
    rawBody: string
  ) => Effect.Effect<ReadonlyArray<RedemptionEvent>, ParseResult.ParseError>

  readonly fetchRedemptions: (              // reconciliation backfill — source of truth
    ctx: MerchantContext,
    since: DateTime.Utc
  ) => Effect.Effect<ReadonlyArray<RedemptionEvent>, AuthError | RateLimited>

  // auth
  readonly buildAuthUrl: (state: string) => string
  readonly exchangeCode: (code: string) => Effect.Effect<MerchantConnection, AuthError>
  readonly refresh: (conn: MerchantConnection) => Effect.Effect<MerchantConnection, AuthError>
}
```
Static infra (an `HttpClient`, `Clock`, provider config) lives in the **`R` channel of the implementation**, supplied when the provider's `Layer` is built — it does not leak into these signatures. Transient failures (`RateLimited`, retryable `ProvisionError`) are absorbed by `Effect.retry(effect, retrySchedule)` inside the adapter, so callers mostly see terminal errors.

### 2.8 Provider registry (how multi-provider works in Effect)

A single `Tag` can't hold three providers at once, so resolve by provider at runtime. Each provider adapter is its own `Effect.Service` (which yields a `.Default` layer):

```ts
class PosAdapterRegistry extends Context.Tag("PosAdapterRegistry")<
  PosAdapterRegistry,
  { readonly get: (p: ProviderId) => Effect.Effect<PosVoucherAdapter, UnknownProviderError> }
>() {}

const RegistryLive = Layer.effect(
  PosAdapterRegistry,
  Effect.gen(function* () {
    const square = yield* SquareAdapter
    // const shopify = yield* ShopifyAdapter   // added later — purely additive
    const table: Partial<Record<ProviderId, PosVoucherAdapter>> = { square }
    return {
      get: (p) =>
        table[p]
          ? Effect.succeed(table[p]!)
          : Effect.fail(new UnknownProviderError({ provider: p }))
    }
  })
).pipe(Layer.provide(SquareAdapter.Default /*, ShopifyAdapter.Default, ... */))
```

Core business logic depends only on `PosAdapterRegistry` and `ConnectionStore` — never on a concrete provider. **Adding a provider = build one more adapter Layer and add it to the registry composition. That is the "zero core change, purely additive" property, made literal by Layer wiring.**

### 2.9 Ingestion flow (per provider)

```
Webhook ─▶ verifyWebhook ─▶ normalizeWebhook (Schema.decode) ─▶ upsert RedemptionEvent (idempotent)
                                                                       │
Reconciliation: Effect.repeat(fetchRedemptions, Schedule.fixed(...)) ──┘  // backfills misses, corrects, enriches
                                                                       │
                                                                       ▶ update Voucher.redemption_count + status
                                                                       ▶ feed dashboard
```

---

## 3. Open decisions / things to pin down per adapter
- **Square:** confirm whether you provision as a Loyalty reward (customer-bound, needs subscription) vs. an Orders-API order discount (no in-POS code-entry surface). This choice drives `customer_binding` and the whole UX. Decide which is the default product.
- **Channel restriction:** Shopify can't restrict to POS-only via third-party app discounts. Decide product behavior when a merchant asks for POS-only on Shopify (warn? block? accept-and-note?) — and which `CapabilityViolation` vs. soft-warning it maps to.
- **Code uniqueness/limits:** centralize code generation; respect per-provider caps (Shopify 20M).
- **Partial redemption / multi-use:** confirm semantics per provider before relying on `partial_redemption`.
- **Customer resolution:** for customer-bound providers, where does the phone/email come from in your flow, and how do you handle "no match in directory" (create profile vs. fail)?
- **Reconciliation cadence + retention:** how far back to poll, how long to keep raw payloads.

---

## 4. Incremental build & rollout

This is deliberately an **incremental, additive** build, and Effect's `Layer` model makes that structural rather than aspirational. The port + capability model means adding a provider touches *zero* core code — a new provider is a new adapter `Layer` + a capability descriptor behind a frozen `Tag`. Protect that property.

### Sequencing
1. **Canonical core + fake adapter first.** Build the domain (voucher model, state machine, validation, ingestion, reconciliation, dashboard) against an in-memory fake provided as a test `Layer` (§5.2) before any real provider. The platform reaches end-to-end working state with no external dependency, and the fake doubles as the reference implementation of the port.
2. **Connection subsystem.** `ConnectionStore` + OAuth as a first-class service — token storage/refresh, scopes, revocation, re-auth. Not glue code.
3. **Square adapter end-to-end:** create → redeem → normalize → reconcile → dashboard, against the Square Sandbox.
4. **Freeze the port** only after sketching the Shopify and Clover adapters on paper against it. Once frozen, treat changes to the `Tag` interface as a versioned event.
5. **Add adapters one at a time** as `Layer`s feeding the registry; capabilities + UI flags absorb the differences. Each is shippable independently.

### Guardrails that keep it incremental
- **Layers make additivity literal.** A new provider is one more `Layer` added to the registry composition (§2.8). Core code depends only on `PosAdapterRegistry` and never recompiles against provider specifics.
- **Per-provider, per-merchant feature flags.** Pilot a provider with a few merchants before GA; kill-switch a misbehaving adapter by dropping its layer, without touching others.
- **Capabilities are the only branch point.** An `if (provider === "square")` in core code means a missing capability flag — push the difference into the descriptor.
- **Versioned port.** When the `Tag` interface must change, bump a version and migrate adapters explicitly rather than letting them drift.
- **Each increment is releasable.** Core+fake is demoable; Square alone is a sellable product; every subsequent provider is pure addition.

---

## 5. Testing strategy

The system is layered, so the tests are too. Most value comes from (a) heavy unit coverage of the provider-agnostic core, (b) **one shared contract-test suite** every adapter must pass, and (c) a few true end-to-end runs against provider sandboxes. Effect's test tooling (`@effect/vitest`, test `Layer`s, `TestClock`) does most of the heavy lifting.

### 5.1 Test pyramid mapped to the architecture

| Layer | What it covers | Where it runs |
|---|---|---|
| **Unit (most tests)** | State machine transitions, constraint→capability validation, code generation, idempotency key derivation, `Schema` decode of fixed payloads | Pure, in-memory, every commit |
| **Adapter contract tests (shared suite)** | Every adapter satisfies the port identically; declared capabilities actually hold | Against the fake (always) + each real adapter (sandbox or recorded fixtures) |
| **Integration** | Real sandbox calls: OAuth exchange, createVoucher, webhook verification, reconciliation polling | Gated job, not every commit |
| **End-to-end** | Full loop: create → simulate redemption → ingest → assert canonical `RedemptionEvent` → assert dashboard numbers | Nightly / pre-release |

### 5.2 The fake adapter = a test `Layer` (highest-leverage investment)
Provide a deterministic in-memory implementation of the port as a `Layer`:

```ts
const PosVoucherAdapterTest = (overrides?: Partial<PosVoucherAdapter>) =>
  Layer.succeed(SquareAdapter, { /* deterministic in-memory impl */ ...overrides })
```
- Lets the entire core, ingestion, reconciliation, and dashboard be tested with **no provider dependency** and zero flakiness.
- Configure it to mimic different capability profiles (customer-bound vs. standalone-code, channel-restrictable vs. not) so you exercise core branching without three real sandboxes.
- Make it misbehave on command — return `Effect.fail(new RateLimited(...))`, drop a webhook, deliver duplicates, reorder events, surface a redemption only via reconciliation — to test the hard paths (§5.5).

### 5.3 Contract testing (the key technique for an abstraction layer)
Write **one** parameterized suite as a function of the layer under test, run it against every adapter:

```ts
const runAdapterContract = (layer: Layer.Layer<PosVoucherAdapter>) => {
  it.effect("createVoucher returns an active/pending ProviderRef", () =>
    Effect.gen(function* () {
      const adapter = yield* SquareAdapter
      const ref = yield* adapter.createVoucher(ctx, sampleVoucher)
      expect(ref.provision_status).toMatch(/active|pending/)
    }).pipe(Effect.provide(layer)))
  // ...capability self-consistency, normalize round-trips, state mapping, etc.
}
```
Assert invariants such as: `normalizeWebhook` on a known payload yields a schema-valid event; on a non-redemption event yields `[]`; **capability self-consistency** — if `customer_binding: "required"`, creating a voucher with no binding fails with `CapabilityViolation` *before* any API call; if `max_codes` is set, exceeding it fails; each native state maps to exactly one canonical state. Generate cases from the capability descriptors so the matrix stays in sync as providers are added.

### 5.4 Provider sandboxes (integration/e2e)
- **Square:** Sandbox access tokens + API Explorer; set up the loyalty program in the sandbox dashboard, create a sandbox order via the Orders API and attach a loyalty reward to drive the redemption path end-to-end.
- **Clover:** sandbox developer account + test merchant; create orders and apply discounts via the REST sandbox; webhooks need a public HTTPS endpoint (tunnel), and Postman mock servers help simulate callbacks.
- **Shopify:** Partner development store; create test orders applying the discount code (with a test/bogus payment) to trigger redemption + order webhooks.
- Verify exact sandbox mechanics against current docs when you build each adapter — **sandbox parity with production is the recurring gotcha**; loyalty, webhooks, and channel behavior are the usual gaps.

### 5.5 Testing the parts that actually break (Effect makes these clean)
- **Simulating in-store redemption in dev.** You can't tap a real register, so drive the provider's order/payment API to stand in for the cashier action, then assert ingestion produces the right canonical event. This *is* the e2e "redeem" step.
- **Error-channel assertions.** Use `Effect.either` / `Effect.flip` to assert a specific tagged error (`RateLimited`, `CapabilityViolation`, `ParseError`) instead of try/catch.
- **Webhook delivery.** Expose the receiver with a tunnel (e.g. ngrok), register it in each provider's dashboard, and test `verifyWebhook` with both valid and tampered HMAC payloads.
- **Idempotency.** Feed the same redemption via webhook *and* reconciliation; assert exactly one `RedemptionEvent` and correct last-write-wins enrichment.
- **Missed / out-of-order / duplicate webhooks.** Drive the fake (or replay captured payloads) to drop, reorder, and duplicate; assert reconciliation converges state correctly.
- **Reconciliation under `TestClock`.** Reconciliation is `Effect.repeat(..., Schedule.fixed(...))`; use `TestClock.adjust(Duration.hours(1))` to fast-forward schedules deterministically with no real waiting. Disable webhooks entirely and assert polling alone recovers every redemption.
- **Partial multi-provider provisioning failure.** One provider succeeds, another fails; assert `ProviderRef` statuses are independent and the voucher stays in a coherent canonical state.
- **Token expiry / revocation mid-operation.** Assert a clean `AuthError` and re-auth prompt rather than silent data loss.

### 5.6 CI hygiene
- Record real sandbox responses once (VCR/nock/WireMock-style, or an `HttpClient` test layer that replays fixtures) and replay in CI so unit + contract tests stay fast and deterministic; refresh recordings on a schedule, not every run.
- Assert every normalized event with `Schema.decodeUnknown(RedemptionEvent)` against a **golden fixture per provider** — guards against silent normalization drift.
- Keep a small nightly suite (`@effect/vitest`'s `it.live`) that hits live sandboxes to catch provider-side changes the recordings would hide.

---

## 6. Manual redemption — no POS linked  🚧 WIP / DRAFT

> Status: brainstorm, not yet firmed up. Captures the current direction so it isn't lost. Revisit the funding-model rigor and the burn-vs-reserve choice before building.

### 6.1 Framing: this is just a first-party adapter
The no-POS case is **not** a special path — it's another provider where the provider is us. A `ManualAdapter` (`provider: "manual"`) implements the same port from §2.7. `createVoucher` writes to our own ledger instead of a POS; there is no webhook; the redemption signal arrives from our merchant-facing surface hitting an endpoint instead of a provider callback. That endpoint emits the same canonical `RedemptionEvent`, so the state machine, idempotency, reconciliation, and dashboard all generalize for free. Our app becomes the lowest-common-denominator POS.

This path also doubles as a **universal fallback** for POS-linked merchants (POS down, code won't scan, etc.), so build it as first-class, not a hack.

### 6.2 Chosen model: A — staff scans the customer (PIN-gated till session)
Considered two models:
- **Model A (chosen):** a shared store surface scans the customer's voucher.
- **Model B (parked):** the customer scans a store code. Clean (zero staff onboarding) but struggles when several vouchers are live at one shop — it doesn't carry which campaign is being redeemed.

**Why A wins here:** the customer presents their specific voucher, so the **voucher code itself carries campaign identity**. With 5 vouchers live at a shop, the system knows which one automatically — staff never pick from a list. Disambiguation happens on the code, not in someone's head.

### 6.3 Key reframe: authenticate the *till*, not the person
A cashier has no account and won't install anything. So the PIN does **not** authenticate an individual — it unlocks a **till session** that turns a shared device/browser into an authorized store register for a shift.

- Owner sets a store **PIN** in the web app and gives staff a per-store redemption **link** (bookmark on the till tablet, or just a URL — no install; suits tech-light shops).
- Staff open the link, enter the PIN once → that device holds a redemption **session** for the shift (e.g. 8–12h, then auto-expires; idle tabs auto-kill).
- One PIN, any number of tills, no per-person setup.
- **Changing the PIN in the web app revokes active sessions** → doubles as staff offboarding ("someone left → rotate the PIN").

### 6.4 Per-customer redemption flow
1. Customer shows their voucher — QR, or a short alphanumeric code as camera-fails fallback. (Voucher can be delivered by email/SMS, so the customer doesn't strictly need our app.)
2. Staff scan/enter it on the unlocked store page.
3. Backend validates: active, in window, not already burned, eligible at this store/session.
4. **Burn** server-side (single-use), then show staff a big, unambiguous instruction: **"Apply £5 off" / "Free coffee."** This result screen *is* the "staff just need to know what to do" piece — they read it and apply the discount at their own till manually.
5. Customer's phone flips to **"Redeemed ✓"** and greys out so it can't be re-shown. Screenshots are useless because the burn is server-side.

### 6.5 Contract deltas needed
- Add `"manual"` to `ProviderId` and to the `RedemptionEvent` `source` enum (`"webhook" | "reconciliation" | "manual"`).
- `ManualAdapter` capability descriptor (provisional):
  ```
  manual: redemption_model: "manual", supports_qr_scan: true,
          can_restrict_channel: true, customer_binding: "optional",
          redemption_event_sources: []   // no webhook/poll — burn is pushed by our surface
  ```
- New burn endpoint (the webhook-equivalent): authenticated by the **till-session token**, takes the scanned voucher code, validates + burns atomically, returns discount instructions. Emits a canonical `RedemptionEvent` with `source: "manual"`, `order_ref: undefined`, `amount_discounted` = nominal/intended (not transaction-confirmed).
- Session subsystem: issue/verify/expire till-session tokens; PIN change ⇒ revoke all sessions for that store.

### 6.6 Decisions to pin down
- **Burn-on-scan vs reserve-then-confirm.** Burn-on-scan (step 4) is simplest and stops re-presentation instantly; risk is a burned voucher if the sale falls through. Alternative: scan = short-TTL **reserve**, a "Confirm" tap does the actual burn, letting staff abort. Lean burn-on-scan for merchant-funded.
- **Session length + re-auth policy.** Pick expiry, idle timeout; treat PIN change as global revocation.
- **Attribution.** Keep **store-level** (no per-employee tracking). Per-staff PINs would reintroduce the onboarding we're avoiding. Revisit only on merchant request.
- **Funding-model rigor (the parked question that sets security level):**
  - *Merchant-funded* → a shared PIN is genuinely enough; a loose redemption only hurts the merchant. Keep it dead simple.
  - *Platform/partner-funded (cashback)* → a shared/leaked PIN lets someone burn from home with our money. Add a **rotating token on the customer's QR** so a burn requires a *live, present* customer, not just PIN knowledge. The weak point is always a static, shareable secret.
- **Offline at the till.** Decide: optimistic local burn that syncs later (double-spend risk) vs hard-fail. Optimistic is acceptable for low-value.

### 6.7 Dashboard trust tier (don't skip)
A PIN-gated manual burn means *"a present customer's voucher was marked used by an authorized till,"* **not** *"a discount hit a real transaction"* — there's no order behind it. Tag manual redemptions as a **lower confidence tier** so analytics don't conflate them with POS-confirmed ones. Surface verified-vs-self-reported distinctly.
