/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

// Tuesday 2025-01-07 12:00 UTC — sits in the week starting Mon 2025-01-06
const WEEK_A_TS = 1736251200000;
// Monday 2025-01-06 00:00 UTC — expected weekStart for WEEK_A_TS
const WEEK_A_START = 1736121600000;
// Tuesday 2025-01-14 12:00 UTC — sits in the week starting Mon 2025-01-13
const WEEK_B_TS = 1736856000000;
// Monday 2025-01-13 00:00 UTC — expected weekStart for WEEK_B_TS
const WEEK_B_START = 1736726400000;

async function seedBiz(
  t: ReturnType<typeof convexTest>,
  name: string,
): Promise<Id<"businesses">> {
  return t.run(async (ctx) => {
    const industryId = await ctx.db.insert("industries", {
      name: "Food",
      category: "Food & Drink",
      slug: `food-admin-${Math.random()}`,
    });
    return ctx.db.insert("businesses", {
      userId: `owner-${Math.random()}`,
      name,
      slug: `slug-${Math.random()}`,
      description: "Test",
      websiteUrl: "https://example.com",
      industryId,
      address: "1 Main St",
      latitude: 51.5,
      longitude: -0.1,
    });
  });
}

// ── auth guard ────────────────────────────────────────────────────────────────

describe("admin analytics auth guards", () => {
  test("getWeeklyFunnel throws for unauthenticated requests", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.functions.adminAnalytics.getWeeklyFunnel, {}),
    ).rejects.toThrow();
  });

  test("getWeeklyFunnel throws for non-admin users", async () => {
    const t = convexTest(schema, modules);
    const userT = t.withIdentity({ subject: "user_1", role: "customer" });
    await expect(
      userT.query(api.functions.adminAnalytics.getWeeklyFunnel, {}),
    ).rejects.toThrow("Forbidden: Admin only");
  });
});

// ── getWeeklyFunnel ───────────────────────────────────────────────────────────

describe("getWeeklyFunnel", () => {
  test("returns empty array when no claims or reveals exist", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    const result = await adminT.query(api.functions.adminAnalytics.getWeeklyFunnel, {});
    expect(result).toEqual([]);
  });

  test("buckets claims from multiple businesses by week", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    const bizA = await seedBiz(t, "Cafe A");
    const bizB = await seedBiz(t, "Cafe B");

    await t.run(async (ctx) => {
      const vA = await ctx.db.insert("vouchers", {
        businessId: bizA,
        userId: "owner-a",
        title: "10% Off",
        description: "Desc",
        provider: "manual",
        discount: { kind: "custom", customText: "10% off" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
      const vB = await ctx.db.insert("vouchers", {
        businessId: bizB,
        userId: "owner-b",
        title: "Free Item",
        description: "Desc",
        provider: "manual",
        discount: { kind: "free_item", itemName: "coffee" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });

      // Two claims in week A
      const c1 = await ctx.db.insert("claims", {
        customerId: "cust-1",
        voucherId: vA,
        claimedAt: WEEK_A_TS,
      });
      const c2 = await ctx.db.insert("claims", {
        customerId: "cust-2",
        voucherId: vB,
        claimedAt: WEEK_A_TS,
      });
      // One claim in week B
      await ctx.db.insert("claims", {
        customerId: "cust-3",
        voucherId: vA,
        claimedAt: WEEK_B_TS,
      });

      // One reveal for c1 in week A, one for c2 in week A
      await ctx.db.insert("reveals", {
        claimId: c1,
        voucherCode: "CODE001",
        revealedAt: WEEK_A_TS,
        expiresAt: 9_999_999_999_999,
      });
      await ctx.db.insert("reveals", {
        claimId: c2,
        voucherCode: "CODE002",
        revealedAt: WEEK_A_TS,
        expiresAt: 9_999_999_999_999,
      });

      // c1 redeemed in week A, c2 redeemed in week B
      await ctx.db.insert("redemptionEvents", {
        voucherId: vA,
        businessId: bizA,
        source: "manual",
        trustTier: "manual",
        occurredAt: WEEK_A_TS,
        recordedAt: WEEK_A_TS,
        claimId: c1,
        customerId: "cust-1",
        idempotencyKey: `manual:${c1}`,
      });
      await ctx.db.insert("redemptionEvents", {
        voucherId: vB,
        businessId: bizB,
        source: "manual",
        trustTier: "manual",
        occurredAt: WEEK_B_TS,
        recordedAt: WEEK_B_TS,
        claimId: c2,
        customerId: "cust-2",
        idempotencyKey: `manual:${c2}`,
      });
    });

    const result = await adminT.query(api.functions.adminAnalytics.getWeeklyFunnel, {});

    expect(result.length).toBeGreaterThanOrEqual(2);
    const week1 = result.find((r) => r.weekStart === WEEK_A_START)!;
    const week2 = result.find((r) => r.weekStart === WEEK_B_START)!;

    expect(week1).toBeDefined();
    expect(week1.claimCount).toBe(2);
    expect(week1.revealCount).toBe(2);
    expect(week1.redemptionCount).toBe(1);

    expect(week2).toBeDefined();
    expect(week2.claimCount).toBe(1);
    expect(week2.redemptionCount).toBe(1);
  });
});

// ── getBusinessLeaderboard ────────────────────────────────────────────────────

describe("getBusinessLeaderboard", () => {
  test("returns empty array when no businesses exist", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    const result = await adminT.query(
      api.functions.adminAnalytics.getBusinessLeaderboard,
      {},
    );
    expect(result).toEqual([]);
  });

  test("ranks businesses by redemption count with zero-activity flag", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    const bizA = await seedBiz(t, "Cafe A");
    const bizB = await seedBiz(t, "Cafe B");

    await t.run(async (ctx) => {
      const vA = await ctx.db.insert("vouchers", {
        businessId: bizA,
        userId: "owner-a",
        title: "10% Off",
        description: "Desc",
        provider: "manual",
        discount: { kind: "custom", customText: "10% off" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
      // bizB has no vouchers → zero-activity

      const c1 = await ctx.db.insert("claims", {
        customerId: "cust-1",
        voucherId: vA,
        claimedAt: 1000,
      });
      await ctx.db.insert("reveals", {
        claimId: c1,
        voucherCode: "CODE001",
        revealedAt: 2000,
        expiresAt: 9_999_999_999_999,
      });
      await ctx.db.insert("redemptionEvents", {
        voucherId: vA,
        businessId: bizA,
        source: "manual",
        trustTier: "manual",
        occurredAt: 3000,
        recordedAt: 3000,
        claimId: c1,
        customerId: "cust-1",
        idempotencyKey: `manual:${c1}`,
      });
    });

    const result = await adminT.query(
      api.functions.adminAnalytics.getBusinessLeaderboard,
      {},
    );

    expect(result).toHaveLength(2);
    const a = result.find((r) => r.businessName === "Cafe A")!;
    const b = result.find((r) => r.businessName === "Cafe B")!;

    expect(a.redemptionCount).toBe(1);
    expect(a.hasZeroActivity).toBe(false);
    expect(b.redemptionCount).toBe(0);
    expect(b.hasZeroActivity).toBe(true);
    // A should rank first
    expect(result.indexOf(a)).toBeLessThan(result.indexOf(b));
  });
});

// ── getCrossBusinessDiscoveryCount ────────────────────────────────────────────

describe("getCrossBusinessDiscoveryCount", () => {
  test("returns 0 when no customers have claimed from multiple businesses", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    const biz = await seedBiz(t, "Cafe A");
    await t.run(async (ctx) => {
      const v = await ctx.db.insert("vouchers", {
        businessId: biz,
        userId: "owner",
        title: "10% Off",
        description: "Desc",
        provider: "manual",
        discount: { kind: "custom", customText: "10% off" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
      await ctx.db.insert("claims", { customerId: "cust-1", voucherId: v, claimedAt: 1000 });
      await ctx.db.insert("claims", { customerId: "cust-2", voucherId: v, claimedAt: 1000 });
    });

    const result = await adminT.query(
      api.functions.adminAnalytics.getCrossBusinessDiscoveryCount,
      {},
    );
    expect(result).toBe(0);
  });

  test("counts customers who claimed from 2+ distinct businesses", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    const bizA = await seedBiz(t, "Cafe A");
    const bizB = await seedBiz(t, "Cafe B");

    await t.run(async (ctx) => {
      const vA = await ctx.db.insert("vouchers", {
        businessId: bizA,
        userId: "owner-a",
        title: "V",
        description: "D",
        provider: "manual",
        discount: { kind: "custom", customText: "deal" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });
      const vB = await ctx.db.insert("vouchers", {
        businessId: bizB,
        userId: "owner-b",
        title: "V",
        description: "D",
        provider: "manual",
        discount: { kind: "custom", customText: "deal" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      });

      // cust-1 claimed from both → discovered
      await ctx.db.insert("claims", { customerId: "cust-1", voucherId: vA, claimedAt: 1000 });
      await ctx.db.insert("claims", { customerId: "cust-1", voucherId: vB, claimedAt: 2000 });
      // cust-2 only from A → not discovered
      await ctx.db.insert("claims", { customerId: "cust-2", voucherId: vA, claimedAt: 1000 });
    });

    const result = await adminT.query(
      api.functions.adminAnalytics.getCrossBusinessDiscoveryCount,
      {},
    );
    expect(result).toBe(1);
  });
});

// ── getPosthogWeeklyViews ─────────────────────────────────────────────────────

describe("getPosthogWeeklyViews", () => {
  test("returns empty array when no cache exists", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    const result = await adminT.query(
      api.functions.adminAnalytics.getPosthogWeeklyViews,
      {},
    );
    expect(result).toEqual([]);
  });

  test("returns cached PostHog weekly view rows", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });

    await t.run(async (ctx) => {
      await ctx.db.insert("posthogWeeklyViews", {
        weekStart: WEEK_A_START,
        viewCount: 42,
        syncedAt: Date.now(),
      });
    });

    const result = await adminT.query(
      api.functions.adminAnalytics.getPosthogWeeklyViews,
      {},
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.weekStart).toBe(WEEK_A_START);
    expect(result[0]!.viewCount).toBe(42);
  });
});
