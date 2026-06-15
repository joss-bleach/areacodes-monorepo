export default {
  providers: [
    {
      // Better Auth issues JWTs with iss = BETTER_AUTH_URL.
      // Convex fetches JWKS from {domain}/.well-known/jwks.json.
      // The apps/api Hono server proxies that to Better Auth's /auth/jwks endpoint.
      domain: process.env.BETTER_AUTH_URL ?? "http://localhost:3003",
      applicationID: "convex",
    },
  ],
};
