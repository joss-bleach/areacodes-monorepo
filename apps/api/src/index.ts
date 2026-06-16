import { Hono } from "hono";
import { auth } from "./auth";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ ok: true });
});

// Mount Better Auth as middleware for all pools (business, admin, customer).
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
