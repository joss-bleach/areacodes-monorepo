# Domain Glossary

## Voucher
A time-bounded discount offer created by a Business. Has a validity window (`voucherValidFrom` / `voucherValidTo`), a title, a description, and a structured discount (see Provisionable Voucher). Every Voucher carries exactly one system-generated Voucher Code — the Business never uploads its own barcode or QR artifact. Whether the Voucher runs on the Square path or the Manual Path is determined by the Business's Connection and the discount's shape (see Provisionable / Non-provisionable Voucher), not by a format chosen at creation.

## Discount Kind
The structured type of a Voucher's offer, chosen first in the creation flow (after the target Provider). Launch kinds: **percentage** and **fixed_amount** (both provisionable — usable on Square and Manual), and **free_item**, **bogof**, and **custom** (Manual-only, human-applied). A Voucher is provisionable to a given Provider only if its Discount Kind is in that Provider's Capability set; the creation flow offers only the kinds the chosen Provider supports. New kinds are added here over time and may later become provisionable.

## Claim
The act of a Customer saving a Voucher to their account. Represents intent — the Customer has expressed interest but has not yet used the Voucher. A Claim is a distinct record linking a Customer to a Voucher. Does not generate a Voucher Code.

## Reveal
The server-side generation of a unique, time-limited Voucher Code. Triggered automatically when a Customer opens a saved Voucher in the Wallet — not an explicit user action. The 2-hour expiry window is a caching and POS-integration concern; if a code has expired when the Customer opens the voucher, a new one is generated silently. Customers are never shown the code expiry countdown.

## Voucher Code
A unique alphanumeric identifier, system-generated at Reveal time — the single canonical identity of a revealed Voucher. It is rendered to the Customer as both text and a QR encoding; QR is purely a rendering of the same code (used for fast scanning), never a separate stored format. On the **Square** path the code is **visual/audit only** — the cashier taps the pre-provisioned discount, so the code is not machine-matched (Square has no per-customer code-entry surface at stock POS). On the **Manual** path the code *is* the match key: our staff surface scans the QR (or accepts the typed code) to burn the Voucher.

## Redemption
A verified use of a Voucher at point of sale. On the **Square** path, confirmed by reconciling paid POS orders that carry our provisioned discount — attributed per **Voucher** (aggregate count), not per Customer. On the **Manual** path, confirmed by our surface burning the Voucher — attributed per **Customer**. See Redemption Trust Tier. (Supersedes the earlier code-matching model in ADR 0001/0002.)

## Redemption Event
A single verified use of a Voucher — the atomic record behind every Redemption. Each event carries its **source** (Square or Manual), when it happened, and its Redemption Trust Tier. Manual events also carry the Customer (via the Claim); Square events carry the provider order reference but no Customer. Events are idempotent: re-reading the same Square order, or re-scanning the same Manual Claim, never produces a duplicate. The single source of truth for "a Redemption happened"; all redemption analytics read from these.

## Redemption Count
The aggregate number of verified Redemptions for a given Voucher — a **derived** total over that Voucher's Redemption Events, not a separately maintained counter. Displayed in the Business dashboard.

## POS Gateway
The abstraction layer that connects our platform to external point-of-sale systems. Owns two responsibilities per provider: **Provisioning** (pushing a Voucher into the merchant's POS so it is usable at the counter) and **Reconciliation** (reading redemption data back). One canonical domain, thin per-provider Adapters behind a stable port. Designed to be extended with new providers over time. Launch providers: **Square** (natively provisioned) and **Manual** (our own first-party path). Zettle by PayPal and other non-provisionable systems route to the Manual path.

## Provisioning
The act of pushing a Voucher created in our system into a merchant's POS so it appears at the point of sale and can be applied to a transaction. Distinct from Reconciliation (reading redemptions back). Not every provider can be provisioned into (e.g. Zettle) — those use the Manual path.

## Provider
An external system a Voucher can be integrated with, behind an Adapter: **Square**, and **Manual** (ourselves). A Provider carries a Capability descriptor stating what it supports: which Discount Kinds it can provision, whether it can attribute redemptions to a specific Customer, how the Voucher is presented to the Customer (a scannable redemption URL vs an audit code only), and how redemptions are reconciled. Core logic and the wallet UI branch on these capabilities, never on the provider's name.

## Manual Path
The first-party redemption path, used when no external POS is provisioned (Zettle merchants, no-POS merchants) and as a universal fallback when a provisioned POS is unavailable. Here *we* are the Provider: redemption is captured on our own staff-facing surface rather than inside a third-party POS. The Manual path is the only launch path that attributes a Redemption to a specific Customer.

## Redemption PIN
A per-Business secret, set and changed by the Business owner in the Business Portal, that gates the Manual burn surface. A staff member scans the Customer's Voucher QR (which opens our web redemption page), enters the Redemption PIN once on their device, and can then confirm redemptions. The PIN is stable until the owner changes it; changing it is the revocation mechanism (it invalidates every already-unlocked device). Suited to the Manual path's merchant-funded stakes — a loose redemption costs only the merchant's own margin.

## Redemption Trust Tier
A confidence label on a Redemption reflecting how strongly it evidences real spend. **Square** (provisioned discount applied on a real, paid POS order): confirmed transaction, but attributed only to the Voucher, not the Customer. **Manual** (our surface marked a present Customer's Voucher used): attributed to the Customer, but no confirmed transaction behind it. Analytics must not conflate the two.

## Connection
A per-Business, per-Provider authorization allowing the POS Gateway to act on the Business's POS account — established via OAuth (staff-assisted during Pilot onboarding). Holds granted scopes and connection health (connected / expired / revoked). Access/refresh tokens are stored encrypted and never exposed in the connection record or logs. Revocation or expiry surfaces a re-auth prompt to the Business.

## Provisionable Voucher
A Voucher whose discount fits what the Business's connected Provider supports (for Square at launch: an order-level percentage or fixed-amount discount) and can therefore be pushed into that POS. Provisionability is a property of the **Voucher** (its discount shape) combined with the Provider's Capability — not merely whether the Business has a Connection.

## Non-provisionable Voucher
A Voucher the connected Provider cannot represent (e.g. free-specific-item, buy-one-get-one, or spend-threshold offers on Square at launch), or a Voucher created by a Business with no provisionable Connection. It is still valid and usable — it runs on the **Manual Path** as a described offer applied by staff. Not an error state; a first-class fallback.

## Integrated Business
A Business with an active provisioning Connection (Square at launch). Their Provisionable Vouchers are pushed into their POS and Redemptions reconciled from real orders. POS integration is the primary selling point of the platform. Such a Business may still create Non-provisionable Vouchers, which run on the Manual Path.

## Non-integrated Business
A Business with no provisioning Connection (e.g. a Zettle or no-POS merchant). All their Vouchers run on the Manual Path — usable and Customer-attributable, but without POS-confirmed transactions. A supported mode, not merely a degraded one.

## Customer
An end consumer who browses the map app or uses the Consumer App. Requires an authenticated account to Claim or Reveal a Voucher. Anonymous browsing is permitted; authentication is required at the point of saving a Voucher.

## Consumer App
The Expo mobile app (iOS and Android) serving Customers. Feature-equal with the map web app — supports the full browse → claim → reveal → wallet flow. Shares the same backend and Customer identity as the web surface.

## Wallet
A Customer's personal view of their saved Vouchers. Displays two user-facing sections: **Active** (voucher validity window still open, not yet redeemed) and **Past** (validity window expired, or Redemption confirmed on the integrated path). The internal Claim/Reveal/Redemption state machine is an implementation detail — not exposed to the Customer. Available on both the map web app and the Consumer App.

## Follow
The act of a Customer subscribing to a Business. A followed Business triggers a push notification to the Customer when a new Voucher is created.

## Service Area
The geographic boundary within which the platform operates. Currently Brighton & Hove. Used to validate business registration (businesses must be located within the Service Area) and displayed as an overlay on the map to inform Customers of coverage. Not used to restrict Consumer access.

## Voucher State Machine
The lifecycle of a single Customer × Voucher interaction:
`unclaimed → claimed → revealed → redeemed | expired`

## Pilot
The manual beta programme during which the team hand-onboards a small cohort of independent Brighton businesses to validate the platform. No self-service registration or billing during the Pilot. Businesses are set up entirely by staff; the Pilot ends when the team has sufficient data to make product and pricing decisions.

## Pilot Business
A Business onboarded during the Pilot by staff via the admin panel. Distinguished from future self-service registrations by having been created without Stripe billing. Pilot Businesses receive free access for the duration of the Pilot.

## Pilot Feature
A product feature that is only active during the Pilot, gated behind the global Pilot Feature Flag. Examples: the Feedback Widget, the first-login walkthrough. Pilot Features are disabled by toggling the flag — no code deletion required at that point.

## Pilot Feature Flag
A single Convex configuration document that lists currently active Pilot Features by key (e.g. `"feedback_widget"`, `"onboarding_walkthrough"`). Global — applies to all Pilot Businesses simultaneously. Managed from the admin panel.

## Admin-Created Business
A Business and its associated Business User account created together by a staff member in the admin panel, rather than through self-service registration. The Business User receives a Magic Link invitation email rather than setting a password.

## Magic Link
The authentication method used by the Business Portal during the Pilot. A Business User enters their email address; a time-limited sign-in link is sent to that address. No password is set or required. Replaces the email/password flow for the Pilot.

## Core Funnel
The key sequence of Customer interactions that proves the platform is driving real-world footfall:
`business_viewed → voucher_claimed → voucher_revealed → voucher_redeemed`
The Claim → Redemption conversion rate is the primary success metric for the Pilot.

## New Customer (at a Business)
A Customer whose first-ever Claim at a given Business occurred during the measurement period. Used to assess whether the platform is driving genuine customer acquisition rather than re-engaging existing regulars.

## Return Customer
A Customer who has Claimed from the same Business more than once. Evidence that the platform supports repeat visits, not just one-off discounted footfall.

## Cross-Business Discovery
A Customer who has Claimed Vouchers from two or more distinct Businesses. The primary signal that Areacodes is functioning as a discovery platform rather than a single-business discount channel.

## Feedback Widget
A floating UI element in the Business Portal that allows a Business User to submit freeform feedback with their current location in the app captured automatically. Submissions are processed by an LLM (via OpenRouter) and filed as GitHub Issues with the labels `feedback` and `business`. Gated behind the Pilot Feature Flag.

## Business Registration Flow
Post-Pilot only. The self-service sequence a Business Owner will complete to join the platform independently. Not active during the Pilot. Details (including billing and verification) to be defined once Pilot data informs product and pricing decisions.
