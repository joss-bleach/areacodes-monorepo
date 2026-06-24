# Convex Better Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone `apps/api` Hono server with `@convex-dev/better-auth`, running Better Auth natively inside Convex — eliminating the need for a separate API server, Neon PostgreSQL database, and Cloudflare tunnel.

**Architecture:** Better Auth runs as a local Convex component in `packages/convex/convex/betterAuth/`, storing auth data (users, sessions) in Convex itself. Auth HTTP routes are served from `*.convex.site`. Web and mobile clients point their auth client at the Convex site URL. The manual `useConvexAuth` JWT-fetch hook is replaced by `ConvexBetterAuthProvider`, which handles token management automatically. Role-based access in Convex functions queries the user record from the Better Auth component's user table.

**Tech Stack:** `@convex-dev/better-auth`, `better-auth`, `@better-auth/expo`, `convex`, TanStack Start (business/admin/map), Expo Router (mobile)

## Global Constraints

- `packages/convex` is the Bun workspace package `@repo/convex` — install dependencies there, not in apps
- The Convex deployment is `dev:sensible-orca-923` with site URL `https://sensible-orca-923.eu-west-1.convex.site`
- Do NOT delete `apps/api` until Task 6 — apps must stay working until the new auth is fully wired up
- Apple Sign-In uses native `expo-apple-authentication` (idToken bridge), not web OAuth — preserve this via the `expo()` Better Auth server plugin
- Role values: `"customer" | "business" | "admin"` — never change these strings, they are stored in the DB
- All `bunx convex` commands must be run from `packages/convex/`, not the repo root
- Keep the Stripe webhook handler in `convex/http.ts` — only add auth routes alongside it

---

## Task 1: Install packages + scaffold the Better Auth Convex component

**Files:**
- Modify: `packages/convex/package.json`
- Create: `packages/convex/convex/convex.config.ts`
- Create: `packages/convex/convex/betterAuth/convex.config.ts`

**Interfaces:**
- Produces: `components.betterAuth` available in `convex/_generated/api` (after `convex dev` picks up the component)

- [ ] **Step 1: Install packages in packages/convex**

```bash
cd packages/convex
bun add better-auth @convex-dev/better-auth @better-auth/expo
```

Expected: `packages/convex/package.json` now has these three in `dependencies`.

- [ ] **Step 2: Create the component definition**

Create `packages/convex/convex/betterAuth/convex.config.ts`:

```ts
import { defineComponent } from "convex/server";

const component = defineComponent("betterAuth");

export default component;
```

- [ ] **Step 3: Register the component in the app's convex.config.ts**

Create `packages/convex/convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config";

const app = defineApp();

app.use(betterAuth);

export default app;
```

- [ ] **Step 4: Verify Convex picks up the component**

Run `bunx convex dev` from `packages/convex/` and watch the output. It should compile without errors and regenerate `convex/_generated/api.d.ts` with `components.betterAuth` visible.

Expected: No TypeScript errors. The `_generated/api.d.ts` will include a `components` export with `betterAuth`.

Stop the dev server after confirming (`Ctrl+C`).

- [ ] **Step 5: Commit**

```bash
git add packages/convex/package.json packages/convex/convex/convex.config.ts packages/convex/convex/betterAuth/convex.config.ts bun.lock
git commit -m "feat(convex): scaffold Better Auth local component"
```

---

## Task 2: Create the Better Auth instance and generate the schema

**Files:**
- Create: `packages/convex/convex/betterAuth/auth.ts`
- Create: `packages/convex/convex/betterAuth/schema.ts` (generated — do not hand-write)
- Create: `packages/convex/convex/betterAuth/adapter.ts`

**Interfaces:**
- Consumes: `components.betterAuth` from `convex/_generated/api`, `authConfig` from `convex/auth.config.ts` (current file, unchanged for now)
- Produces:
  - `authComponent` — the Better Auth/Convex client accessor, imported in `http.ts` and `admin.ts`
  - `createAuth(ctx)` — factory consumed by `http.ts` to mount routes
  - `options` — consumed by the `auth` CLI for schema generation

- [ ] **Step 1: Create the Better Auth instance**

Create `packages/convex/convex/betterAuth/auth.ts`:

```ts
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import * as z from "zod";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

const roleSchema = z.enum(["customer", "business", "admin"]);

export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  { local: { schema }, verbose: false },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    appName: "Areacodes",
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    trustedOrigins: [
      "areacodes://",
      "exp://*",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    emailAndPassword: { enabled: true },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID ?? "com.acbrighton.consumer",
        appBundleIdentifier:
          process.env.APPLE_APP_BUNDLE_ID ?? "com.acbrighton.consumer",
      },
    },
    plugins: [
      expo(),
      convex({ authConfig }),
    ],
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "customer",
          validator: { input: roleSchema, output: roleSchema },
        },
      },
    },
  } satisfies BetterAuthOptions;
};

// For `auth` CLI schema generation — needs a context-free options object
export const options = createAuthOptions({} as GenericCtx<DataModel>);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
```

Note: TypeScript will show an error on `import schema from "./schema"` because the file doesn't exist yet. That's expected — fixed in the next step.

- [ ] **Step 2: Generate the Better Auth schema**

Run from `packages/convex/`:

```bash
bunx @better-auth/cli generate \
  --config ./convex/betterAuth/auth.ts \
  --output ./convex/betterAuth/schema.ts
```

Expected: `convex/betterAuth/schema.ts` is created with table definitions for `user`, `session`, `account`, `verification`, and any plugin tables. TypeScript error in `auth.ts` disappears.

- [ ] **Step 3: Create the adapter exports**

Create `packages/convex/convex/betterAuth/adapter.ts`:

```ts
import { createApi } from "@convex-dev/better-auth";
import { createAuthOptions } from "./auth";
import schema from "./schema";

export const {
  create,
  findOne,
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = createApi(schema, createAuthOptions);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd packages/convex
bun run check-types
```

Expected: No errors from the `betterAuth/` directory. There may be unrelated pre-existing errors in other files — do not fix them now.

- [ ] **Step 5: Commit**

```bash
git add packages/convex/convex/betterAuth/auth.ts packages/convex/convex/betterAuth/schema.ts packages/convex/convex/betterAuth/adapter.ts
git commit -m "feat(convex): add Better Auth instance and generated schema"
```

---

## Task 3: Wire up Convex auth config and HTTP routes + set env vars

**Files:**
- Modify: `packages/convex/convex/auth.config.ts`
- Modify: `packages/convex/convex/http.ts`
- Modify: `packages/convex/.env.local` (Convex env vars, set via CLI — document what to set)

**Interfaces:**
- Consumes: `authComponent` and `createAuth` from `convex/betterAuth/auth`
- Produces: Better Auth HTTP routes live at `https://sensible-orca-923.eu-west-1.convex.site/auth/*`; Convex JWT validation uses the component's JWKS endpoint (no more external JWKS proxy)

- [ ] **Step 1: Replace auth.config.ts**

Overwrite `packages/convex/convex/auth.config.ts`:

```ts
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
```

This replaces the manual JWKS domain pointing at `BETTER_AUTH_URL` (the tunnel/API server). The component handles JWKS internally.

- [ ] **Step 2: Add Better Auth routes to http.ts**

The existing Stripe webhook handler must stay. Add Better Auth route registration alongside it.

Overwrite `packages/convex/convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./betterAuth/auth";

const http = httpRouter();

// Better Auth handles all /auth/* routes
authComponent.registerRoutes(http, createAuth);

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = sigHeader.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const signature = v1Part.slice(3);
  const signedPayload = `${timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload),
  );

  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === signature;
}

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const payload = await request.text();
    const sigHeader = request.headers.get("stripe-signature") ?? "";

    const isValid = await verifyStripeSignature(payload, sigHeader, secret);
    if (!isValid) {
      return new Response("Invalid signature", { status: 400 });
    }

    let event: unknown;
    try {
      event = JSON.parse(payload);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const knownTypes = new Set([
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_failed",
    ]);

    const eventType = (event as { type?: string }).type;
    if (!eventType || !knownTypes.has(eventType)) {
      return new Response("OK", { status: 200 });
    }

    await ctx.runMutation(internal.functions.subscriptions.handleWebhookEvent, {
      event,
    });

    return new Response("OK", { status: 200 });
  }),
});

export default http;
```

- [ ] **Step 3: Set Convex environment variables**

Run each command from `packages/convex/`:

```bash
# From apps/api/.env.local — copy the value
bunx convex env set BETTER_AUTH_SECRET "3e3f214d3c1c345ff29b3ce37ec33a9297eb6f16538b0e8857f28d6edf107e31"

# SITE_URL = the business app's URL (used for email links and OAuth redirects)
bunx convex env set SITE_URL "http://localhost:3000"

# Google OAuth — copy from apps/api/.env.local
bunx convex env set GOOGLE_CLIENT_ID "<your-google-client-id>"
bunx convex env set GOOGLE_CLIENT_SECRET "<your-google-client-secret>"

# Apple — copy from apps/api/.env.local
bunx convex env set APPLE_CLIENT_ID "com.acbrighton.consumer"
bunx convex env set APPLE_APP_BUNDLE_ID "com.acbrighton.consumer"
```

Note: `BETTER_AUTH_URL` in `packages/convex/.env.local` can now be removed — it was only needed by the old `auth.config.ts` to point at the JWKS proxy. The new auth config uses the component's JWKS endpoint automatically.

- [ ] **Step 4: Start convex dev and verify routes appear**

```bash
cd packages/convex
bunx convex dev
```

In another terminal, test that the Better Auth health endpoint is reachable:

```bash
curl https://sensible-orca-923.eu-west-1.convex.site/auth/ok
```

Expected: HTTP 200 with `{"ok":true}` or similar. This confirms Better Auth routes are live on the Convex site URL.

Stop convex dev (`Ctrl+C`) after confirming.

- [ ] **Step 5: Commit**

```bash
git add packages/convex/convex/auth.config.ts packages/convex/convex/http.ts
git commit -m "feat(convex): wire Better Auth routes into Convex HTTP router"
```

---

## Task 4: Update role-based authorization in Convex functions

**Files:**
- Modify: `packages/convex/convex/functions/admin.ts`

**Interfaces:**
- Consumes: `authComponent` from `convex/betterAuth/auth`
- Produces: `requireAdmin(ctx)` that looks up role from the Convex user table (not from a JWT claim)

The old approach read `role` from a JWT custom claim: `(identity as { role?: string }).role`. With the Convex Better Auth component, the JWT no longer carries a custom `role` claim. Instead, `role` is stored as an additional field on the user record and must be queried from Convex.

- [ ] **Step 1: Update requireAdmin in admin.ts**

Modify the top of `packages/convex/convex/functions/admin.ts`:

```ts
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../betterAuth/auth";

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");

  // Query the user record from the Better Auth component's user table
  const user = await authComponent.getUser(ctx, identity.subject);
  if (!user || (user as { role?: string }).role !== "admin") {
    throw new Error("Forbidden: Admin only");
  }
  return identity.subject;
}
```

Note: `authComponent.getUser` is the expected API from `@convex-dev/better-auth`. If this method doesn't exist on the installed version, check `authComponent`'s TypeScript types after installation — look for a method that retrieves a user by ID from the component's internal table. The `identity.subject` is the Better Auth user ID.

- [ ] **Step 2: Scan for any other role-from-JWT checks**

```bash
grep -rn "\.role" packages/convex/convex/functions/ --include="*.ts"
```

For each hit that reads `identity.role` or casts the identity to get a role, apply the same pattern: query the user via `authComponent.getUser(ctx, identity.subject)` and read the role from the returned object.

- [ ] **Step 3: Type-check**

```bash
cd packages/convex
bun run check-types
```

Expected: No errors in `functions/admin.ts`. Fix any type errors found.

- [ ] **Step 4: Commit**

```bash
git add packages/convex/convex/functions/admin.ts
git commit -m "feat(convex): query user role from Better Auth component instead of JWT claim"
```

---

## Task 5: Update web app auth clients (business, admin, map)

**Files:**
- Modify: `apps/business/app/lib/auth-client.ts`
- Modify: `apps/business/app/routes/__root.tsx`
- Delete: `apps/business/app/lib/use-convex-auth.ts`
- Modify: `apps/business/.env`
- Modify: `apps/admin/app/lib/auth-client.ts`
- Modify: `apps/admin/app/routes/__root.tsx`
- Delete: `apps/admin/app/lib/use-convex-auth.ts`
- Modify: `apps/admin/.env`
- Modify: `apps/map/app/lib/auth-client.ts`
- Modify: `apps/map/app/routes/__root.tsx`
- Delete: `apps/map/app/lib/use-convex-auth.ts`
- Modify: `apps/map/.env`

**Interfaces:**
- Consumes: `VITE_CONVEX_SITE_URL` env var (the `*.convex.site` URL)
- Produces: Each web app uses `ConvexBetterAuthProvider` from `@convex-dev/better-auth/react`

Each web app needs `@convex-dev/better-auth` installed in its own package.json because the client plugin comes from there.

- [ ] **Step 1: Install client package in each web app**

```bash
bun add @convex-dev/better-auth --filter "@areacodes/business"
bun add @convex-dev/better-auth --filter "@areacodes/admin"
bun add @convex-dev/better-auth --filter "@areacodes/map"
```

(Run from repo root; if `--filter` doesn't match, run `bun add @convex-dev/better-auth` from each app directory.)

- [ ] **Step 2: Add VITE_CONVEX_SITE_URL to business .env**

Edit `apps/business/.env` — add the site URL line and remove `VITE_API_URL`:

```diff
-VITE_API_URL=https://omaha-thumbzilla-pound-speaking.trycloudflare.com
+VITE_CONVEX_SITE_URL=https://sensible-orca-923.eu-west-1.convex.site
 VITE_CONVEX_URL=https://sensible-orca-923.eu-west-1.convex.cloud
 CONVEX_DEPLOY_KEY=dev:sensible-orca-923|eyJ2MiI6ImI4Njg5MWNiZTFhNDRlMGY5NTc4OGEyMTMyNTA5MWYzIn0=
 GOOGLE_PLACES_API_KEY=AIzaSyDTtgyJpoWgZkld63vOk9G-PTQm_UswJBk
 RESEND_API_KEY=re_Vesi8Gys_HKCRMmcUgAy2vUSYH734maBD
```

Also update `apps/business/.env.example` and `apps/business/.env.local` (if it exists) with the same change.

- [ ] **Step 3: Update business auth-client.ts**

Overwrite `apps/business/app/lib/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { roleSchema } from "@repo/types";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL as string,
  plugins: [
    convexClient(),
    inferAdditionalFields({
      user: {
        role: { type: "string", validator: { input: roleSchema, output: roleSchema } },
      },
    }),
  ],
});
```

- [ ] **Step 4: Update business __root.tsx**

In `apps/business/app/routes/__root.tsx`, replace `ConvexProviderWithAuth` with `ConvexBetterAuthProvider`:

```ts
// Remove these imports:
// import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
// import { useConvexAuth } from "~/lib/use-convex-auth";

// Add these imports:
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "~/lib/auth-client";
```

Replace the `RootComponent` body:

```tsx
function RootComponent() {
  return (
    <RootDocument>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <NuqsAdapter>
          <Outlet />
          <Toaster />
          <CookieBanner />
        </NuqsAdapter>
      </ConvexBetterAuthProvider>
    </RootDocument>
  );
}
```

- [ ] **Step 5: Delete business use-convex-auth.ts**

```bash
rm apps/business/app/lib/use-convex-auth.ts
```

- [ ] **Step 6: Apply the same changes to admin**

**`apps/admin/.env`** — swap `VITE_API_URL` for `VITE_CONVEX_SITE_URL=https://sensible-orca-923.eu-west-1.convex.site`

**`apps/admin/app/lib/auth-client.ts`** — overwrite with:

```ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL as string,
  plugins: [convexClient()],
});
```

**`apps/admin/app/routes/__root.tsx`** — same provider swap as business (step 4), removing `NuqsAdapter` if admin doesn't use it:

```tsx
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "~/lib/auth-client";

// in RootComponent:
function RootComponent() {
  return (
    <RootDocument>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <Outlet />
        <Toaster />
        <CookieBanner />
      </ConvexBetterAuthProvider>
    </RootDocument>
  );
}
```

```bash
rm apps/admin/app/lib/use-convex-auth.ts
```

- [ ] **Step 7: Apply the same changes to map**

**`apps/map/.env`** — swap `VITE_API_URL` for `VITE_CONVEX_SITE_URL=https://sensible-orca-923.eu-west-1.convex.site`

**`apps/map/app/lib/auth-client.ts`** — overwrite with:

```ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL as string,
  plugins: [convexClient()],
});
```

**`apps/map/app/routes/__root.tsx`** — same provider swap:

```tsx
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "~/lib/auth-client";

function RootComponent() {
  return (
    <RootDocument>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <NuqsAdapter>
          <Outlet />
          <CookieBanner />
        </NuqsAdapter>
      </ConvexBetterAuthProvider>
    </RootDocument>
  );
}
```

```bash
rm apps/map/app/lib/use-convex-auth.ts
```

- [ ] **Step 8: Smoke-test business app compiles**

```bash
cd apps/business
bun run check-types
```

Expected: No errors. Fix any `VITE_API_URL` references that remain (search: `grep -r "VITE_API_URL" apps/business/`).

Repeat for admin and map.

- [ ] **Step 9: Commit**

```bash
git add apps/business/ apps/admin/ apps/map/
git commit -m "feat(web): migrate business/admin/map to ConvexBetterAuthProvider"
```

---

## Task 6: Update mobile auth client

**Files:**
- Modify: `apps/mobile/app/lib/auth-client.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Delete: `apps/mobile/app/lib/use-convex-auth.ts`
- Modify: `apps/mobile/.env`

**Interfaces:**
- Consumes: `EXPO_PUBLIC_CONVEX_SITE_URL` env var
- Produces: Mobile uses `ConvexBetterAuthProvider` from `@convex-dev/better-auth/react`

- [ ] **Step 1: Install client package in mobile**

```bash
bun add @convex-dev/better-auth --filter "@areacodes/mobile"
```

(Or `cd apps/mobile && bun add @convex-dev/better-auth`)

- [ ] **Step 2: Update mobile .env**

Edit `apps/mobile/.env`:

```diff
-EXPO_PUBLIC_API_URL=https://omaha-thumbzilla-pound-speaking.trycloudflare.com
+EXPO_PUBLIC_CONVEX_SITE_URL=https://sensible-orca-923.eu-west-1.convex.site
 EXPO_PUBLIC_CONVEX_URL=https://sensible-orca-923.eu-west-1.convex.cloud
 EXPO_PUBLIC_POSTHOG_API_KEY=
 EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

- [ ] **Step 3: Update mobile auth-client.ts**

Overwrite `apps/mobile/app/lib/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL ?? "https://sensible-orca-923.eu-west-1.convex.site",
  plugins: [
    convexClient(),
    expoClient({
      scheme: "areacodes",
      storage: {
        getItem: SecureStore.getItem,
        setItem: SecureStore.setItemAsync,
      },
    }),
  ],
});
```

- [ ] **Step 4: Update mobile _layout.tsx**

In `apps/mobile/app/_layout.tsx`:

Replace:
```tsx
import { ConvexProviderWithAuth } from "convex/react";
import { useConvexAuth } from "./lib/use-convex-auth";
```

With:
```tsx
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
```

Find the JSX that wraps the app with auth (it uses `convex` and `useConvexAuth`):
```tsx
// Old:
<ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
  {children}
</ConvexProviderWithAuth>

// New:
<ConvexBetterAuthProvider client={convex} authClient={authClient}>
  {children}
</ConvexBetterAuthProvider>
```

Also add the `authClient` import at the top:
```ts
import { authClient } from "./lib/auth-client";
```

- [ ] **Step 5: Delete use-convex-auth.ts**

```bash
rm apps/mobile/app/lib/use-convex-auth.ts
```

- [ ] **Step 6: Check for remaining EXPO_PUBLIC_API_URL references**

```bash
grep -rn "EXPO_PUBLIC_API_URL" apps/mobile/ --include="*.ts" --include="*.tsx"
```

Expected: No results. If any remain, update them to `EXPO_PUBLIC_CONVEX_SITE_URL`.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): migrate to ConvexBetterAuthProvider"
```

---

## Task 7: Delete the API app and rewrite dev scripts

At this point all apps are using the Convex-hosted Better Auth. The tunnel, API server, and Neon DB are no longer needed for development.

**Files:**
- Delete: `apps/api/` (entire directory)
- Overwrite: `scripts/dev-web.sh`
- Overwrite: `scripts/dev-mobile.sh`
- Delete: `scripts/set-tunnel-url.sh`
- Delete: `scripts/start-tunnel.sh`
- Modify: `package.json` (root) — remove any API-related scripts
- Modify: `turbo.json` — remove CLERK/API env vars if they're stale

**Interfaces:**
- Produces: `bun run dev:business`, `bun run dev:admin`, `bun run dev:map`, `bun run mobile:dev` all work without a tunnel or API server

- [ ] **Step 1: Verify apps work before deleting anything**

With `convex dev` running in one terminal, run the business app in another:

```bash
bun run dev:business
```

Sign in / sign up at `http://localhost:3000`. Confirm auth works end-to-end against the Convex-hosted Better Auth.

Fix any issues before proceeding. Do not delete the API app until this is confirmed working.

- [ ] **Step 2: Delete the API app**

```bash
rm -rf apps/api
```

- [ ] **Step 3: Delete tunnel scripts**

```bash
rm scripts/set-tunnel-url.sh scripts/start-tunnel.sh
```

- [ ] **Step 4: Rewrite dev-web.sh**

The old script started: cloudflared tunnel → set-tunnel-url → convex dev → API server → app.
The new script starts: convex dev → app. No tunnel, no API.

Overwrite `scripts/dev-web.sh`:

```bash
#!/usr/bin/env bash
# Usage: bash scripts/dev-web.sh <app> <port>
#   e.g. bash scripts/dev-web.sh business 3000
set -euo pipefail

APP="${1:-}"
PORT="${2:-}"

if [[ -z "$APP" || -z "$PORT" ]]; then
  echo "Usage: $0 <app> <port>"
  echo "  e.g. $0 business 3000"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDS=()

cleanup() {
  echo ""
  echo "Shutting down..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "Starting Convex dev..."
(cd "$ROOT/packages/convex" && bunx convex dev) &
PIDS+=($!)

echo "Starting $APP app (port $PORT)..."
bun run --cwd "$ROOT/apps/$APP" dev &
PIDS+=($!)

echo ""
echo "Auth: https://sensible-orca-923.eu-west-1.convex.site"
echo "App:  http://localhost:$PORT"
echo ""
echo "All services running. Press Ctrl+C to stop."
wait
```

- [ ] **Step 5: Rewrite dev-mobile.sh**

Overwrite `scripts/dev-mobile.sh`:

```bash
#!/usr/bin/env bash
# Starts Convex dev and Expo Go concurrently for mobile development.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDS=()

cleanup() {
  echo ""
  echo "Shutting down..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "Starting Convex dev..."
(cd "$ROOT/packages/convex" && bunx convex dev) &
PIDS+=($!)

echo "Starting Expo Go..."
bun run --cwd "$ROOT/apps/mobile" dev -- --go &
PIDS+=($!)

echo ""
echo "Auth: https://sensible-orca-923.eu-west-1.convex.site"
echo ""
echo "All services running. Press Ctrl+C to stop."
wait
```

- [ ] **Step 6: Update root package.json dev scripts**

In `package.json` (root), there are no API-specific scripts to remove (the existing ones call the shell scripts which we've already updated). Verify:

```bash
grep -n "api\|tunnel\|cloudflare" package.json
```

Expected: No hits. If any exist, remove them.

- [ ] **Step 7: Remove BETTER_AUTH_URL from packages/convex/.env.local**

Edit `packages/convex/.env.local` — remove the `BETTER_AUTH_URL` line. That env var was only needed by the old `auth.config.ts`:

```diff
 # Deployment used by `npx convex dev`
 CONVEX_DEPLOYMENT=dev:sensible-orca-923

 CONVEX_URL=https://sensible-orca-923.eu-west-1.convex.cloud

 CONVEX_SITE_URL=https://sensible-orca-923.eu-west-1.convex.site

-# Tunnel URL for auth config — updated by scripts/set-tunnel-url.sh on each dev session
-BETTER_AUTH_URL=https://omaha-thumbzilla-pound-speaking.trycloudflare.com
```

- [ ] **Step 8: Update turbo.json env var list**

In `turbo.json`, the `build.env` array contains `CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` (stale from a previous auth system). Remove those and add the Better Auth vars:

```json
"env": [
  "VITE_CONVEX_URL",
  "VITE_CONVEX_SITE_URL",
  "CONVEX_DEPLOY_KEY",
  "GOOGLE_PLACES_API_KEY"
]
```

- [ ] **Step 9: Final smoke test — run all dev scripts**

```bash
# Test web
bun run dev:business   # ctrl+c after confirming auth works at http://localhost:3000
bun run dev:admin      # ctrl+c after confirming auth works at http://localhost:3002

# Test mobile (needs a device/simulator)
bun run mobile:dev
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: remove API server + tunnel, migrate auth entirely to Convex"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Better Auth runs in Convex (no separate server) | Task 1, 2, 3 |
| Auth data in Convex (not Neon) | Task 2 (schema in betterAuth/schema.ts) |
| Email/password auth | Task 2 (auth.ts options) |
| Google OAuth | Task 2 + Task 3 (env vars) |
| Apple native sign-in (expo plugin) | Task 2 (expo() plugin) |
| Role-based access in Convex functions | Task 4 |
| Business app migrated | Task 5 |
| Admin app migrated | Task 5 |
| Map app migrated | Task 5 |
| Mobile app migrated | Task 6 |
| No tunnel in dev | Task 7 |
| API app removed | Task 7 |
| Dev scripts simplified | Task 7 |

**Known verification point:** In Task 4, `authComponent.getUser(ctx, userId)` is the expected API — verify the exact method name against the installed `@convex-dev/better-auth` TypeScript types before finalizing. The `identity.subject` from `ctx.auth.getUserIdentity()` is the Better Auth user ID and is the correct key to look up with.
