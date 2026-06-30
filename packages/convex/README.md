# @areacodes/convex

Convex backend (functions, schema, and generated client) for the Areacodes platform.

## Environment variables

These are configured on the Convex deployment (e.g. via `npx convex env set <NAME> <value>`),
not in the app `.env` files. They are read at runtime via `process.env` inside Convex functions.

| Variable | Required by | Notes |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Auth | Better Auth signing secret. |
| `SITE_URL` | Auth | Public site URL used by Better Auth. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Auth | Google OAuth credentials. |
| `APPLE_CLIENT_ID` / `APPLE_APP_BUNDLE_ID` | Auth | Apple Sign-In credentials. |
| `RESEND_API_KEY` | Admin (invitation email) | Resend API key for transactional email. |
| `BUSINESS_PORTAL_URL` | Admin (invitation email) | Base URL for Business Portal links. |
| `STRIPE_WEBHOOK_SECRET` | Billing | Verifies Stripe webhook signatures. |
| `OPENROUTER_API_KEY` | Feedback Widget | OpenRouter API key used to format feedback into a GitHub Issue title/body. |
| `GITHUB_TOKEN` | Feedback Widget | Fine-grained GitHub PAT with `issues:write` scope on `joss-bleach/areacodes-monorepo`. Used to file feedback as Issues. |

### Feedback Widget

The Business Portal Feedback Widget (`functions/feedback.ts`) requires both
`OPENROUTER_API_KEY` and `GITHUB_TOKEN` to be set on the Convex deployment. Without them
the `submitFeedback` action will fail when it calls OpenRouter / GitHub. The widget itself
is additionally gated behind the `"feedback_widget"` Pilot Feature key.
