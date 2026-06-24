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
A free trial period offered to newly registered Businesses. Duration is configurable (not hardcoded). Card details are collected at registration via Stripe; no charge is made until the Pilot ends. The Pilot clock starts at registration, regardless of admin approval status. After the Pilot, a paid Subscription begins automatically.

## Subscription
A Business's paid access to the platform. Flat monthly fee (currently £20/month, configurable). Single tier at launch. Managed via Stripe Billing. Subscription state (status, trial end, current period end, Stripe IDs) is stored in Convex, linked to the Business. Cancellation takes effect at end of the current billing period — access remains live until then. Businesses manage billing (card updates, cancellation, invoices) via the Stripe Customer Portal.

## Subscription Status
The current billing state of a Business's Subscription:
`trialing → active → past_due → canceled`
A grace period of 7 days applies on payment failure before vouchers are suspended. Manual reinstatement is available via the admin app.

## Business Registration Flow
The sequence a Business Owner completes to join the platform:
1. Account creation
2. Business profile submission
3. Card details captured via Stripe → Pilot begins → voucher publishing immediately unlocked

Card capture is the sole quality filter. No admin approval is required to publish vouchers.
