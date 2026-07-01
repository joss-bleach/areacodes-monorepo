/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

async function seedBusiness(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const industryId = await ctx.db.insert("industries", {
      name: "Food",
      category: "Food & Drink",
      slug: `food-analytics-${Math.random()}`,
    });
    return ctx.db.insert("businesses", {
      userId: "owner-1",
      name: "Test Cafe",
      slug: `test-cafe-analytics-${Math.random()}`,
      description: "A test cafe",
      websiteUrl: "https://example.com",
      industryId,
      address: "1 High St",
      latitude: 50.82,
      longitude: -0.14,
    });
  });
}

// ── getTotalRedemptions ───────────────────────────────────────────────────────

describe("getTotalRedemptions", () => {
  test("returns 0 when business has no vouchers", async () => {
    const t = convexTest(schema, modules);
    const businessT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    const count = await businessT.query(
      api.functions.pilotAnalytics.getTotalRedemptions,
      { businessId },
    );

    expect(count).toBe(0);
  });

  test("returns 0 when vouchers have no redeemed reveals", async () => {
    const t = convexTest(schema, modules);
    const businessT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      const voucherId = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "10% Off",
        description: "Save 10%",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
      const claimId = await ctx.db.insert("claims", {
        customerId: "cust-1",
        voucherId,
        claimedAt: 1000,
      });
      // reveal without redeemedAt
      await ctx.db.insert("reveals", {
        claimId,
        voucherCode: "ABCDEF123456",
        revealedAt: 2000,
        expiresAt: 9999999,
      });
    });

    const count = await businessT.query(
      api.functions.pilotAnalytics.getTotalRedemptions,
      { businessId },
    );

    expect(count).toBe(0);
  });

  test("counts redeemed reveals across vouchers", async () => {
    const t = convexTest(schema, modules);
    const businessT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      const v1 = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "V1",
        description: "V1",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
      const v2 = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "V2",
        description: "V2",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });

      const c1 = await ctx.db.insert("claims", {
        customerId: "cust-1",
        voucherId: v1,
        claimedAt: 1000,
      });
      const c2 = await ctx.db.insert("claims", {
        customerId: "cust-2",
        voucherId: v2,
        claimedAt: 1000,
      });
      const c3 = await ctx.db.insert("claims", {
        customerId: "cust-3",
        voucherId: v2,
        claimedAt: 1000,
      });

      await ctx.db.insert("reveals", {
        claimId: c1,
        voucherCode: "CODE000001",
        revealedAt: 2000,
        expiresAt: 9999999
      });
      await ctx.db.insert("reveals", {
        claimId: c2,
        voucherCode: "CODE000002",
        revealedAt: 2000,
        expiresAt: 9999999
      });
      // c3 not redeemed
      await ctx.db.insert("reveals", {
        claimId: c3,
        voucherCode: "CODE000003",
        revealedAt: 2000,
        expiresAt: 9999999,
      });
      // Redemption events for c1 and c2 (c3 was not redeemed)
      await ctx.db.insert("redemptionEvents", {
        voucherId: v1,
        businessId,
        source: "manual",
        trustTier: "manual",
        occurredAt: 3000,
        recordedAt: 3000,
        claimId: c1,
        customerId: "cust-1",
        idempotencyKey: `manual:${c1}`,
      });
      await ctx.db.insert("redemptionEvents", {
        voucherId: v2,
        businessId,
        source: "manual",
        trustTier: "manual",
        occurredAt: 3000,
        recordedAt: 3000,
        claimId: c2,
        customerId: "cust-2",
        idempotencyKey: `manual:${c2}`,
      });
    });

    const count = await businessT.query(
      api.functions.pilotAnalytics.getTotalRedemptions,
      { businessId },
    );

    expect(count).toBe(2);
  });
});

// ── getNewCustomerCount ───────────────────────────────────────────────────────

describe("getNewCustomerCount", () => {
  test("returns 0 when no claims exist", async () => {
    const t = convexTest(schema, modules);
    const businessT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "V1",
        description: "V1",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
    });

    const count = await businessT.query(
      api.functions.pilotAnalytics.getNewCustomerCount,
      { businessId },
    );

    expect(count).toBe(0);
  });

  test("counts each distinct acquired customer across all vouchers", async () => {
    const t = convexTest(schema, modules);
    const businessT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      const v1 = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "V1",
        description: "V1",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
      const v2 = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "V2",
        description: "V2",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });

      // cust-new: claimed v1 only → acquired customer
      await ctx.db.insert("claims", { customerId: "cust-new", voucherId: v1, claimedAt: 1000 });
      // cust-return: claimed both v1 and v2 → still an acquired customer, counted once
      await ctx.db.insert("claims", { customerId: "cust-return", voucherId: v1, claimedAt: 1000 });
      await ctx.db.insert("claims", { customerId: "cust-return", voucherId: v2, claimedAt: 2000 });
    });

    const count = await businessT.query(
      api.functions.pilotAnalytics.getNewCustomerCount,
      { businessId },
    );

    expect(count).toBe(2);
  });
});

// ── getReturnCustomerCount ────────────────────────────────────────────────────

describe("getReturnCustomerCount", () => {
  test("returns 0 when no customers have multiple claims", async () => {
    const t = convexTest(schema, modules);
    const businessT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      const v1 = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "V1",
        description: "V1",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
      await ctx.db.insert("claims", { customerId: "cust-1", voucherId: v1, claimedAt: 1000 });
      await ctx.db.insert("claims", { customerId: "cust-2", voucherId: v1, claimedAt: 1000 });
    });

    const count = await businessT.query(
      api.functions.pilotAnalytics.getReturnCustomerCount,
      { businessId },
    );

    expect(count).toBe(0);
  });

  test("counts customers with 2 or more claims", async () => {
    const t = convexTest(schema, modules);
    const businessT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    await t.run(async (ctx) => {
      const v1 = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "V1",
        description: "V1",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
      const v2 = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "V2",
        description: "V2",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });

      // cust-return: claims v1 and v2
      await ctx.db.insert("claims", { customerId: "cust-return", voucherId: v1, claimedAt: 1000 });
      await ctx.db.insert("claims", { customerId: "cust-return", voucherId: v2, claimedAt: 2000 });
      // cust-new: only v1
      await ctx.db.insert("claims", { customerId: "cust-new", voucherId: v1, claimedAt: 1000 });
    });

    const count = await businessT.query(
      api.functions.pilotAnalytics.getReturnCustomerCount,
      { businessId },
    );

    expect(count).toBe(1);
  });
});

// ── getVoucherStats ───────────────────────────────────────────────────────────

describe("getVoucherStats", () => {
  test("returns empty array when business has no vouchers", async () => {
    const t = convexTest(schema, modules);
    const businessT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    const stats = await businessT.query(
      api.functions.pilotAnalytics.getVoucherStats,
      { businessId },
    );

    expect(stats).toEqual([]);
  });

  test("returns per-voucher claim, reveal, and redemption counts", async () => {
    const t = convexTest(schema, modules);
    const businessT = t.withIdentity({ subject: "owner-1" });
    const businessId = await seedBusiness(t);

    let voucherId: string;
    await t.run(async (ctx) => {
      const v1 = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-1",
        title: "10% Off",
        description: "Save 10%",
        provider: "manual",
        discount: { kind: "custom", customText: "test" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
      voucherId = v1 as unknown as string;

      const c1 = await ctx.db.insert("claims", { customerId: "cust-1", voucherId: v1, claimedAt: 1000 });
      const c2 = await ctx.db.insert("claims", { customerId: "cust-2", voucherId: v1, claimedAt: 1000 });

      // c1: revealed and redeemed (redemptionEvent inserted)
      await ctx.db.insert("reveals", {
        claimId: c1,
        voucherCode: "CODE000001",
        revealedAt: 2000,
        expiresAt: 9999999
      });
      // c2: revealed but not redeemed
      await ctx.db.insert("reveals", {
        claimId: c2,
        voucherCode: "CODE000002",
        revealedAt: 2000,
        expiresAt: 9999999,
      });
      await ctx.db.insert("redemptionEvents", {
        voucherId: v1,
        businessId,
        source: "manual",
        trustTier: "manual",
        occurredAt: 3000,
        recordedAt: 3000,
        claimId: c1,
        customerId: "cust-1",
        idempotencyKey: `manual:${c1}`,
      });
    });

    const stats = await businessT.query(
      api.functions.pilotAnalytics.getVoucherStats,
      { businessId },
    );

    expect(stats).toHaveLength(1);
    expect(stats[0]!.title).toBe("10% Off");
    expect(stats[0]!.claimCount).toBe(2);
    expect(stats[0]!.revealCount).toBe(2);
    expect(stats[0]!.redemptionCount).toBe(1);
  });
});
