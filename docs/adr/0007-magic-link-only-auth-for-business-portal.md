# ADR-0007: Magic Link as Sole Authentication Method for Business Portal

## Status
Accepted

## Context
During the Pilot, Business Users are created by staff in the admin panel — not through self-service registration. Staff create the user account (linked to the business owner's email) and the Business record simultaneously. The business owner never sets a password.

The Business Portal sign-in page previously offered email/password and Google OAuth. With admin-created accounts, there is no password to enter, making the password field non-functional for Pilot Businesses.

## Decision
Replace email/password authentication on the Business Portal with Magic Link only for the Pilot. The business owner enters their email; a time-limited sign-in link is sent. Google OAuth is also removed to keep the sign-in surface simple and consistent with how Pilot Businesses are onboarded.

The sign-up link is removed from the sign-in page — self-service registration is not available during the Pilot.

## Consequences
- Pilot Businesses have a frictionless first login: enter email, click link, done. No password management.
- A returning Business User must always have access to their email to sign in. This is acceptable for a small, hand-picked Pilot cohort.
- Post-Pilot, when self-service registration is introduced, password and/or Google OAuth can be re-added alongside Magic Link.
- Requires adding the Better Auth magic link plugin to the auth configuration.
