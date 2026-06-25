# ADR-0008: Staff-Created Business Accounts for the Pilot

## Status
Accepted

## Context
The platform's intended end state is self-service business registration: a business owner signs up, fills in their profile, connects billing, and is live. Building and validating this flow requires knowing what information to collect, how to verify businesses, and what the right pricing model is — none of which are known before the Pilot.

## Decision
During the Pilot, all Business accounts and Business records are created by staff in the admin panel. Staff collect business information and the owner's email address offline (e.g. via a sign-up form or direct outreach), enter it into the admin panel, and trigger a Magic Link invitation email to the business owner.

The business owner's first interaction with the platform is logging into an account that is already fully configured — they proceed directly to connecting their POS and adding vouchers.

Self-service registration is disabled during the Pilot (sign-up route removed from the Business Portal).

## Consequences
- Staff control the quality and completeness of business profiles at the cost of manual effort per business. Acceptable at Pilot scale (small, hand-picked cohort).
- Businesses experience a high-quality first login with their profile already populated. This reduces the risk of drop-off during onboarding.
- No billing or verification infrastructure needs to be built before the Pilot launches.
- Post-Pilot, the admin "Add Business" capability is retained as a permanent tool for staff to onboard businesses directly — separate from whatever self-service flow is introduced.
- The decision on subscription tiers, pricing, and verification is deferred until Pilot data informs it.
