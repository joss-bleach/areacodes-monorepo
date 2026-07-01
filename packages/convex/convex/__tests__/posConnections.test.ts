/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
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
