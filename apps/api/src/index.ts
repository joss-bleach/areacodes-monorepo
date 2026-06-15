import { Hono } from "hono";
import { auth } from "./auth";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ ok: true });
});

// Apple Sign-In is explicitly disabled.
// TODO: Enable when upstream @better-auth/expo bug #7049 is resolved.
// See: https://github.com/better-auth/better-auth/issues/7049
app.all("/auth/apple/*", (c) => {
  return c.json(
    {
      error: "Apple Sign-In is temporarily disabled",
      reason:
        "Upstream @better-auth/expo bug #7049: Apple Sign-In hangs in production builds",
    },
    501,
  );
});

// Mount Better Auth as middleware for all pools (business, admin, customer).
// Using app.use (not app.on) to avoid Hono router conflicts with the Apple block above.
app.use("/auth/*", (c) => auth.handler(c.req.raw));

// Proxy JWKS to root level for Convex JWKS discovery.
// Convex resolves {domain}/.well-known/jwks.json using the JWT issuer as domain.
// Better Auth's JWT plugin exposes JWKS at /auth/jwks.
app.get("/.well-known/jwks.json", (c) => {
  return auth.handler(
    new Request(
      new URL("/auth/jwks", c.req.url).toString(),
      { method: "GET" },
    ),
  );
});

export default app;
