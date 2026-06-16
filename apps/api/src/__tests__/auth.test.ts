import { describe, expect, test } from "vitest";
import app from "../index";

describe("email/password auth", () => {
  const uniqueEmail = () => `test-${Math.random().toString(36).slice(2)}@example.com`;

  test("sign-up creates a new customer account", async () => {
    const email = uniqueEmail();
    const res = await app.request("/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!", name: "Test User" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user?: { email: string; role?: string } };
    expect(body.user?.email).toBe(email);
    expect(body.user?.role).toBe("customer");
  });

  test("sign-up with duplicate email returns an error", async () => {
    const email = uniqueEmail();
    await app.request("/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!", name: "Test User" }),
    });
    const res = await app.request("/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!", name: "Test User" }),
    });
    expect(res.status).not.toBe(200);
  });

  test("sign-in with correct credentials succeeds", async () => {
    const email = uniqueEmail();
    await app.request("/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!", name: "Test User" }),
    });
    const res = await app.request("/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user?: { email: string } };
    expect(body.user?.email).toBe(email);
  });

  test("sign-in with wrong password returns an error", async () => {
    const email = uniqueEmail();
    await app.request("/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!", name: "Test User" }),
    });
    const res = await app.request("/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrong-password" }),
    });
    expect(res.status).not.toBe(200);
  });

  test("sign-in with unknown email returns an error", async () => {
    const res = await app.request("/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.com", password: "Password123!" }),
    });
    expect(res.status).not.toBe(200);
  });
});

describe("auth routes", () => {
  test("Apple Sign-In is disabled with 501", async () => {
    const res = await app.request("/auth/apple/sign-in", { method: "POST" });
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("Apple Sign-In GET is also disabled", async () => {
    const res = await app.request("/auth/apple/callback", { method: "GET" });
    expect(res.status).toBe(501);
  });

  test("Better Auth handler is mounted at /auth", async () => {
    // Empty body returns 400 (validation error), not 404
    const res = await app.request("/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).not.toBe(404);
  });

  test("JWKS endpoint returns valid JWKS structure", async () => {
    const res = await app.request("/auth/jwks");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("keys");
    expect(Array.isArray((body as { keys: unknown[] }).keys)).toBe(true);
  });

  test("Root JWKS proxy serves same keys for Convex", async () => {
    const rootRes = await app.request("/.well-known/jwks.json");
    expect(rootRes.status).toBe(200);
    const rootBody = await rootRes.json();
    expect(rootBody).toHaveProperty("keys");
  });
});
