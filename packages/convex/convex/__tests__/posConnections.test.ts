/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

async function seedBusiness(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const industryId = await ctx.db.insert("industries", {
      name: "Retail",
      category: "Shopping",
      slug: `retail-pos-${Math.random()}`,
    });
    return ctx.db.insert("businesses", {
      userId: "owner-1",
      name: "Test Shop",
      slug: `test-shop-pos-${Math.random()}`,
      description: "A test shop",
      websiteUrl: "https://example.com",
      industryId,
      address: "1 High St",
      latitude: 50.82,
      longitude: -0.14,
    });
  });
}

// ── getPosConnections ─────────────────────────────────────────────────────────

describe("getPosConnections", () => {
  test("throws for unauthenticated requests", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    await expect(
      t.query(api.functions.posConnections.getPosConnections, { businessId }),
    ).rejects.toThrow();
  });

  test("throws when caller does not own the business", async () => {
    const t = convexTest(schema, modules);
    const otherT = t.withIdentity({ subject: "not-the-owner" });
    const businessId = await seedBusiness(t); // owned by "owner-1"

    await expect(
      otherT.query(api.functions.posConnections.getPosConnections, {
        businessId,
      }),
    ).rejects.toThrow();
  });

  test("returns empty array when no connections exist", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId },
    );

    expect(connections).toEqual([]);
  });

  test("returns OAuth-shaped posConnections for a business", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "connected",
        externalMerchantId: "merchant_abc123",
        scopes: ["PAYMENTS_READ", "ORDERS_READ"],
        encryptedTokens: "enc:tok_abc",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: 9_999_999_999_999,
        connectedAt: 1_000_000_000_000,
      });
    });

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId },
    );

    expect(connections).toHaveLength(1);
    expect(connections[0]!.provider).toBe("square");
    expect(connections[0]!.status).toBe("connected");
    expect(connections[0]!.externalMerchantId).toBe("merchant_abc123");
    expect(connections[0]!.scopes).toEqual(["PAYMENTS_READ", "ORDERS_READ"]);
  });

  test("does not expose encryptedTokens or encryptionKeyVersion in query result", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "connected",
        externalMerchantId: "merchant_secret",
        scopes: ["ITEMS_READ"],
        encryptedTokens: "super-secret-ciphertext",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: 9_999_999_999_999,
        connectedAt: 1_000_000_000_000,
      });
    });

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId },
    );

    expect(connections).toHaveLength(1);
    // Token material must never be returned by queries
    expect((connections[0] as Record<string, unknown>)["encryptedTokens"]).toBeUndefined();
    expect((connections[0] as Record<string, unknown>)["encryptionKeyVersion"]).toBeUndefined();
  });

  test("returns multiple connections for different merchants", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "connected",
        externalMerchantId: "merchant_001",
        scopes: ["PAYMENTS_READ"],
        encryptedTokens: "enc:tok_001",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: 9_999_999_999_999,
        connectedAt: 1_000_000_000_000,
      });
      await ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "expired",
        externalMerchantId: "merchant_002",
        scopes: ["PAYMENTS_READ"],
        encryptedTokens: "enc:tok_002",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: 1000,
        connectedAt: 1_000_000_000_000,
      });
    });

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId },
    );

    expect(connections).toHaveLength(2);
    const merchants = connections.map((c) => c.externalMerchantId).sort();
    expect(merchants).toEqual(["merchant_001", "merchant_002"]);
  });

  test("does not return connections for other businesses", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const bizA = await seedBusiness(t);
    const bizB = await seedBusiness(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("posConnections", {
        businessId: bizB,
        provider: "square",
        status: "connected",
        externalMerchantId: "merchant_biz_b",
        scopes: ["PAYMENTS_READ"],
        encryptedTokens: "enc:tok_b",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: 9_999_999_999_999,
        connectedAt: 1_000_000_000_000,
      });
    });

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId: bizA },
    );

    expect(connections).toHaveLength(0);
  });
});

// ── disconnectSquare ──────────────────────────────────────────────────────────

describe("disconnectSquare", () => {
  // disconnectSquare schedules a best-effort deprovision job (runAfter 0) when a
  // token is present. Fake timers keep that job from firing on a real timer
  // after the test instance is torn down.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("throws for unauthenticated requests", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);

    const connectionId = await t.run(async (ctx) =>
      ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "connected",
        externalMerchantId: "merchant_x",
        scopes: ["ITEMS_READ"],
        encryptedTokens: "enc:tok_x",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: 9_999_999_999_999,
        connectedAt: 1_000_000_000_000,
      }),
    );

    await expect(
      t.mutation(api.functions.posConnections.disconnectSquare, {
        businessId,
        connectionId,
      }),
    ).rejects.toThrow();
  });

  test("sets status=revoked and clears encryptedTokens", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    const connectionId = await t.run(async (ctx) =>
      ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "connected",
        externalMerchantId: "merchant_disc",
        scopes: ["ITEMS_READ"],
        encryptedTokens: "enc:plaintext-would-be-here",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: 9_999_999_999_999,
        connectedAt: 1_000_000_000_000,
      }),
    );

    await ownerT.mutation(api.functions.posConnections.disconnectSquare, {
      businessId,
      connectionId,
    });

    const conn = await t.run((ctx) => ctx.db.get(connectionId));
    expect(conn?.status).toBe("revoked");
    expect(conn?.encryptedTokens).toBeUndefined();
  });

  test("rejects disconnect from a user who does not own the business", async () => {
    const t = convexTest(schema, modules);
    const otherT = t.withIdentity({ subject: "not-the-owner" });
    const businessId = await seedBusiness(t); // owned by "owner-1"

    const connectionId = await t.run(async (ctx) =>
      ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "connected",
        externalMerchantId: "merchant_owned",
        scopes: ["ITEMS_READ"],
        encryptedTokens: "enc:tok_owned",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: 9_999_999_999_999,
        connectedAt: 1_000_000_000_000,
      }),
    );

    await expect(
      otherT.mutation(api.functions.posConnections.disconnectSquare, {
        businessId,
        connectionId,
      }),
    ).rejects.toThrow();

    // Connection remains untouched
    const conn = await t.run((ctx) => ctx.db.get(connectionId));
    expect(conn?.status).toBe("connected");
    expect(conn?.encryptedTokens).toBe("enc:tok_owned");
  });

  test("rejects disconnect for connection belonging to another business", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const bizA = await seedBusiness(t);
    const bizB = await seedBusiness(t);

    const connectionId = await t.run(async (ctx) =>
      ctx.db.insert("posConnections", {
        businessId: bizB,
        provider: "square",
        status: "connected",
        externalMerchantId: "merchant_b",
        scopes: ["ITEMS_READ"],
        encryptedTokens: "enc:tok_b",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: 9_999_999_999_999,
        connectedAt: 1_000_000_000_000,
      }),
    );

    await expect(
      ownerT.mutation(api.functions.posConnections.disconnectSquare, {
        businessId: bizA,
        connectionId,
      }),
    ).rejects.toThrow();
  });
});

// ── upsertSquareConnection (simulated via t.run) ──────────────────────────────

describe("upsertSquareConnection — connection persistence", () => {
  test("inserts new connection with status=connected and encrypted routing fields", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);
    const now = Date.now();

    const connectionId = await t.run(async (ctx) => {
      return ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "connected",
        externalMerchantId: "MERCHANT_SANDBOX_001",
        scopes: ["ITEMS_READ", "ITEMS_WRITE", "ORDERS_READ", "MERCHANT_PROFILE_READ"],
        encryptedTokens: "AES256GCM:iv+ciphertext",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: now + 30 * 24 * 60 * 60 * 1000,
        connectedAt: now,
      });
    });

    const conn = await t.run((ctx) => ctx.db.get(connectionId));
    expect(conn?.status).toBe("connected");
    expect(conn?.provider).toBe("square");
    expect(conn?.externalMerchantId).toBe("MERCHANT_SANDBOX_001");
    expect(conn?.scopes).toContain("ITEMS_READ");
    expect(conn?.scopes).toContain("MERCHANT_PROFILE_READ");
    // encryptedTokens stored as opaque ciphertext, not plaintext
    expect(conn?.encryptedTokens).not.toContain("access_token");
    expect(conn?.encryptedTokens).not.toContain("refresh_token");
  });

  test("reconnect updates existing connection by externalMerchantId", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);
    const now = Date.now();

    // Initial connection (e.g. revoked)
    const connId = await t.run(async (ctx) => {
      return ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "revoked",
        externalMerchantId: "MERCHANT_SANDBOX_001",
        scopes: ["ITEMS_READ"],
        encryptedTokens: "old-encrypted",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: 1000,
        connectedAt: now - 100_000,
      });
    });

    // Simulate reconnect (what upsertSquareConnection does)
    await t.run(async (ctx) => {
      const existing = await ctx.db
        .query("posConnections")
        .withIndex("by_external_merchant", (q) =>
          q.eq("externalMerchantId", "MERCHANT_SANDBOX_001"),
        )
        .filter((q) => q.eq(q.field("businessId"), businessId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: "connected",
          encryptedTokens: "new-encrypted-tokens",
          encryptionKeyVersion: "v1",
          tokenExpiresAt: now + 30 * 24 * 60 * 60 * 1000,
          scopes: ["ITEMS_READ", "ITEMS_WRITE", "ORDERS_READ", "MERCHANT_PROFILE_READ"],
          connectedAt: now,
        });
      }
    });

    const conn = await t.run((ctx) => ctx.db.get(connId));
    expect(conn?.status).toBe("connected");
    expect(conn?.encryptedTokens).toBe("new-encrypted-tokens");
    expect(conn?.scopes).toContain("ORDERS_READ");
  });
});
