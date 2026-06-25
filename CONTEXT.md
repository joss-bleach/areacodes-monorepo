# Domain Glossary

## Voucher
A time-bounded discount offer created by a Business. Has a validity window (`voucherValidFrom` / `voucherValidTo`), a title, and a description. A voucher is either **POS-integrated** (the Business has connected a supported POS system) or **non-integrated** (fallback upload/generated-text path).

## Claim
The act of a Customer saving a Voucher to their account. Represents intent — the Customer has expressed interest but has not yet used the Voucher. A Claim is a distinct record linking a Customer to a Voucher. Does not generate a Voucher Code.

## Reveal
The server-side generation of a unique, time-limited Voucher Code. Triggered automatically when a Customer opens a saved Voucher in the Wallet — not an explicit user action. The 2-hour expiry window is a caching and POS-integration concern; if a code has expired when the Customer opens the voucher, a new one is generated silently. Customers are never shown the code expiry countdown.

## Voucher Code
A unique alphanumeric identifier generated at Reveal time. Displayed to the Customer as both text and QR. On the integrated path, the code is matched against POS transaction records to confirm Redemption. On the non-integrated path, the code is presented to the business manually with no automated verification.

## Redemption
A verified use of a Voucher at point of sale. On the integrated path, confirmed by matching the Voucher Code against the Business's POS transaction records via polling. On the non-integrated path, not verifiable — only Claim and Reveal events are tracked.

## Redemption Count
The aggregate number of verified Redemptions for a given Voucher. Updated by the POS polling job on its configured interval (daily/weekly). Displayed in the Business dashboard.

## POS Gateway
The abstraction layer that connects our platform to external point-of-sale systems. Handles reading transaction/discount data from each supported provider on a polling schedule. Designed to be extended with new providers over time. Initial providers: Square, Zettle by PayPal.

## Integrated Business
A Business that has connected their POS account via the POS Gateway. Their Vouchers use the generated-code path. Redemptions are verified via polling. POS integration is the primary selling point of the platform.

## Non-integrated Business
A Business that has not connected a POS. Their Vouchers use the fallback path: uploaded QR/barcode image or generated text code presented manually. Only Claim and Reveal events are tracked — no verified Redemption data. Treated as a fallback, not the intended state.

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
