/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

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

async function seedVoucherWithReveal(
  t: ReturnType<typeof convexTest>,
  businessId: Awaited<ReturnType<typeof seedBusiness>>,
  voucherCode: string,
) {
  return t.run(async (ctx) => {
    const voucherId = await ctx.db.insert("vouchers", {
      businessId,
      userId: "owner-1",
      title: "10% off",
      description: "Test voucher",
      voucherFormat: "generated_text",
      voucherValidFrom: 1,
      voucherValidTo: 9_999_999_999_999,
    });

    const claimId = await ctx.db.insert("claims", {
      customerId: "customer-1",
      voucherId,
      claimedAt: Date.now(),
    });

    await ctx.db.insert("reveals", {
      claimId,
      voucherCode,
      revealedAt: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    });

    return { voucherId, claimId };
  });
}

describe("connectPosProvider", () => {
  test("creates a posConnection record for a business", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await ownerT.mutation(api.functions.posConnections.connectPosProvider, {
      businessId,
      provider: "square",
      apiKey: "sq_test_key",
    });

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId },
    );

    expect(connections).toHaveLength(1);
    expect(connections[0]?.provider).toBe("square");
    expect(connections[0]?.businessId).toBe(businessId);
    const creds = JSON.parse(connections[0]!.credentials) as { apiKey: string };
    expect(creds.apiKey).toBe("sq_test_key");
  });

  test("replaces existing connection for same provider", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await ownerT.mutation(api.functions.posConnections.connectPosProvider, {
      businessId,
      provider: "square",
      apiKey: "old_key",
    });
    await ownerT.mutation(api.functions.posConnections.connectPosProvider, {
      businessId,
      provider: "square",
      apiKey: "new_key",
    });

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId },
    );

    expect(connections).toHaveLength(1);
    const creds = JSON.parse(connections[0]!.credentials) as { apiKey: string };
    expect(creds.apiKey).toBe("new_key");
  });

  test("allows connecting both Square and Zettle independently", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await ownerT.mutation(api.functions.posConnections.connectPosProvider, {
      businessId,
      provider: "square",
      apiKey: "sq_key",
    });
    await ownerT.mutation(api.functions.posConnections.connectPosProvider, {
      businessId,
      provider: "zettle",
      apiKey: "zt_key",
    });

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId },
    );

    expect(connections).toHaveLength(2);
    expect(connections.map((c) => c.provider).sort()).toEqual(["square", "zettle"]);
  });
});

describe("disconnectPosProvider", () => {
  test("removes the posConnection for a provider", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await ownerT.mutation(api.functions.posConnections.connectPosProvider, {
      businessId,
      provider: "square",
      apiKey: "sq_key",
    });
    await ownerT.mutation(api.functions.posConnections.disconnectPosProvider, {
      businessId,
      provider: "square",
    });

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId },
    );

    expect(connections).toHaveLength(0);
  });

  test("is a no-op when no connection exists", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    // Should not throw
    await ownerT.mutation(api.functions.posConnections.disconnectPosProvider, {
      businessId,
      provider: "zettle",
    });

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId },
    );
    expect(connections).toHaveLength(0);
  });
});

describe("upsertRedemptionCounts", () => {
  test("increments voucher redemptionCount for a matching voucherCode", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);
    const { voucherId } = await seedVoucherWithReveal(t, businessId, "A1B2C3D4E5F6");

    await t.mutation(internal.functions.posConnections.upsertRedemptionCounts, {
      counts: [{ voucherCode: "A1B2C3D4E5F6", count: 3 }],
    });

    const voucher = await t.run(async (ctx) => ctx.db.get(voucherId));
    expect(voucher?.redemptionCount).toBe(3);
  });

  test("accumulates redemptionCount across multiple polling runs", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);
    const { voucherId } = await seedVoucherWithReveal(t, businessId, "X9Y8Z7W6V5U4");

    await t.mutation(internal.functions.posConnections.upsertRedemptionCounts, {
      counts: [{ voucherCode: "X9Y8Z7W6V5U4", count: 2 }],
    });
    await t.mutation(internal.functions.posConnections.upsertRedemptionCounts, {
      counts: [{ voucherCode: "X9Y8Z7W6V5U4", count: 1 }],
    });

    const voucher = await t.run(async (ctx) => ctx.db.get(voucherId));
    expect(voucher?.redemptionCount).toBe(3);
  });

  test("ignores voucherCodes with no matching reveal", async () => {
    const t = convexTest(schema, modules);

    // Should not throw even though no matching reveal exists
    await t.mutation(internal.functions.posConnections.upsertRedemptionCounts, {
      counts: [{ voucherCode: "UNKNOWNCODE12", count: 5 }],
    });
  });

  test("skips counts of zero", async () => {
    const t = convexTest(schema, modules);
    const businessId = await seedBusiness(t);
    const { voucherId } = await seedVoucherWithReveal(t, businessId, "P1Q2R3S4T5U6");

    await t.mutation(internal.functions.posConnections.upsertRedemptionCounts, {
      counts: [{ voucherCode: "P1Q2R3S4T5U6", count: 0 }],
    });

    const voucher = await t.run(async (ctx) => ctx.db.get(voucherId));
    expect(voucher?.redemptionCount).toBeUndefined();
  });
});

describe("Redemption Count visible per voucher", () => {
  test("getVouchersByBusiness includes redemptionCount field", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);
    const { voucherId } = await seedVoucherWithReveal(t, businessId, "C1D2E3F4G5H6");

    await t.mutation(internal.functions.posConnections.upsertRedemptionCounts, {
      counts: [{ voucherCode: "C1D2E3F4G5H6", count: 7 }],
    });

    const vouchers = await ownerT.query(
      api.functions.vouchers.getVouchersByBusiness,
      { businessId },
    );

    const v = vouchers.find((vch) => vch._id === voucherId);
    expect(v?.redemptionCount).toBe(7);
  });
});
