/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

const NOW = 1_700_000_000_000;
const FUTURE = NOW + 86_400_000;

async function seedData(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const industryId = await ctx.db.insert("industries", {
      name: "Food",
      category: "Food & Drink",
      slug: `food-re-${Math.random()}`,
    });
    const businessId = await ctx.db.insert("businesses", {
      userId: "owner-re",
      name: "RE Shop",
      slug: `re-shop-${Math.random()}`,
      description: "Test",
      websiteUrl: "https://re.com",
      industryId,
      address: "1 St",
      latitude: 50.8,
      longitude: -0.1,
    });
    const voucherId = await ctx.db.insert("vouchers", {
      businessId,
      userId: "owner-re",
      title: "Free coffee",
      description: "One free coffee",
      provider: "manual",
      discount: { kind: "free_item", itemName: "coffee" },
      provisioning: { status: "not_required" },
      voucherValidFrom: NOW - 1000,
      voucherValidTo: FUTURE,
    });
    const claimId = await ctx.db.insert("claims", {
      customerId: "customer-re",
      voucherId,
      claimedAt: NOW,
    });
    return { businessId, voucherId, claimId };
  });
}

// ── getStaffRedemptionPage ────────────────────────────────────────────────────

describe("getStaffRedemptionPage", () => {
  test("returns voucher + claim + business data for a valid claim", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, claimId } = await seedData(t);

    const result = await t.query(
      api.functions.redemptionEvents.getStaffRedemptionPage,
      { voucherId, claimId },
    );

    expect(result).not.toBeNull();
    expect(result!.voucher.title).toBe("Free coffee");
    expect(result!.voucher.discount.kind).toBe("free_item");
    expect(result!.claim.customerId).toBe("customer-re");
    expect(result!.isRedeemed).toBe(false);
    expect(result!.businessId).toBeDefined();
  });

  test("returns null when claim does not match voucher (claim is from another voucher)", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, claimId, businessId } = await seedData(t);

    // Create a completely separate voucher+claim pair
    const { voucherId: otherVoucherId, claimId: otherClaimId } = await t.run(async (ctx) => {
      const v2 = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-re",
        title: "Other",
        description: "Other",
        provider: "manual",
        discount: { kind: "custom", customText: "other" },
        provisioning: { status: "not_required" },
        voucherValidFrom: NOW - 1000,
        voucherValidTo: FUTURE,
      });
      const c2 = await ctx.db.insert("claims", {
        customerId: "customer-other-mismatch",
        voucherId: v2,
        claimedAt: NOW,
      });
      return { voucherId: v2, claimId: c2 };
    });

    // Pass mismatched IDs — claimId belongs to otherVoucher, not voucherId
    const result = await t.query(
      api.functions.redemptionEvents.getStaffRedemptionPage,
      { voucherId, claimId: otherClaimId },
    );

    expect(result).toBeNull();
  });

  test("returns null when claimId does not belong to the voucher", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, businessId } = await seedData(t);

    // Create a different claim for a different voucher
    const otherClaimId = await t.run(async (ctx) => {
      const otherVoucherId = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-re",
        title: "Other",
        description: "Other",
        provider: "manual",
        discount: { kind: "custom", customText: "other" },
        provisioning: { status: "not_required" },
        voucherValidFrom: NOW - 1000,
        voucherValidTo: FUTURE,
      });
      return ctx.db.insert("claims", {
        customerId: "customer-other",
        voucherId: otherVoucherId,
        claimedAt: NOW,
      });
    });

    const result = await t.query(
      api.functions.redemptionEvents.getStaffRedemptionPage,
      { voucherId, claimId: otherClaimId },
    );

    expect(result).toBeNull();
  });

  test("includes isRedeemed:true when a redemptionEvent exists", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, claimId, businessId } = await seedData(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("redemptionEvents", {
        voucherId,
        businessId,
        source: "manual",
        trustTier: "manual",
        occurredAt: NOW,
        recordedAt: NOW,
        claimId,
        customerId: "customer-re",
        idempotencyKey: `manual:${claimId}`,
      });
    });

    const result = await t.query(
      api.functions.redemptionEvents.getStaffRedemptionPage,
      { voucherId, claimId },
    );

    expect(result!.isRedeemed).toBe(true);
  });

  test("includes pinSetAt from redemptionAuth when a PIN is set", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, claimId, businessId } = await seedData(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("redemptionAuth", {
        businessId,
        redemptionPinHash: "$argon2id$fake",
        redemptionPinSetAt: 1_234_567,
      });
    });

    const result = await t.query(
      api.functions.redemptionEvents.getStaffRedemptionPage,
      { voucherId, claimId },
    );

    expect(result!.pinSetAt).toBe(1_234_567);
  });

  test("pinSetAt is null when no PIN has been set", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, claimId } = await seedData(t);

    const result = await t.query(
      api.functions.redemptionEvents.getStaffRedemptionPage,
      { voucherId, claimId },
    );

    expect(result!.pinSetAt).toBeNull();
  });
});

// ── burnManualVoucher ─────────────────────────────────────────────────────────

describe("burnManualVoucher", () => {
  test("creates a redemptionEvent with manual idempotency key", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, claimId, businessId } = await seedData(t);

    await t.mutation(api.functions.redemptionEvents.burnManualVoucher, {
      voucherId,
      claimId,
      businessId,
      now: NOW + 1,
    });

    const event = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionEvents")
        .withIndex("by_idempotency", (q) =>
          q.eq("idempotencyKey", `manual:${claimId}`),
        )
        .first(),
    );

    expect(event).not.toBeNull();
    expect(event!.source).toBe("manual");
    expect(event!.trustTier).toBe("manual");
    expect(event!.claimId).toBe(claimId);
    expect(event!.customerId).toBe("customer-re");
    expect(event!.voucherId).toBe(voucherId);
    expect(event!.businessId).toBe(businessId);
    expect(event!.idempotencyKey).toBe(`manual:${claimId}`);
  });

  test("is idempotent — second call is a no-op and does not throw", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, claimId, businessId } = await seedData(t);

    await t.mutation(api.functions.redemptionEvents.burnManualVoucher, {
      voucherId,
      claimId,
      businessId,
      now: NOW + 1,
    });
    // Second call should be silently accepted
    await expect(
      t.mutation(api.functions.redemptionEvents.burnManualVoucher, {
        voucherId,
        claimId,
        businessId,
        now: NOW + 2,
      }),
    ).resolves.not.toThrow();

    // Still only one event
    const events = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionEvents")
        .withIndex("by_idempotency", (q) =>
          q.eq("idempotencyKey", `manual:${claimId}`),
        )
        .collect(),
    );
    expect(events).toHaveLength(1);
  });

  test("throws for a deleted voucher", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, claimId, businessId } = await seedData(t);

    await t.run(async (ctx) => {
      await ctx.db.patch(voucherId, { deletedAt: NOW - 100 });
    });

    await expect(
      t.mutation(api.functions.redemptionEvents.burnManualVoucher, {
        voucherId,
        claimId,
        businessId,
        now: NOW + 1,
      }),
    ).rejects.toThrow();
  });

  test("throws for an expired voucher", async () => {
    const t = convexTest(schema, modules);
    const { claimId, businessId } = await seedData(t);

    const expiredVoucherId = await t.run(async (ctx) => {
      const business = await ctx.db
        .query("businesses")
        .filter((q) => q.eq(q.field("userId"), "owner-re"))
        .first();
      return ctx.db.insert("vouchers", {
        businessId: business!._id,
        userId: "owner-re",
        title: "Expired",
        description: "Expired voucher",
        provider: "manual",
        discount: { kind: "custom", customText: "expired" },
        provisioning: { status: "not_required" },
        voucherValidFrom: NOW - 2000,
        voucherValidTo: NOW - 1000,
      });
    });
    const expiredClaimId = await t.run(async (ctx) =>
      ctx.db.insert("claims", {
        customerId: "customer-re2",
        voucherId: expiredVoucherId,
        claimedAt: NOW,
      }),
    );

    await expect(
      t.mutation(api.functions.redemptionEvents.burnManualVoucher, {
        voucherId: expiredVoucherId,
        claimId: expiredClaimId,
        businessId,
        now: NOW + 1,
      }),
    ).rejects.toThrow();
  });

  test("throws for a voucher not yet in window", async () => {
    const t = convexTest(schema, modules);
    const { claimId, businessId } = await seedData(t);

    const futureVoucherId = await t.run(async (ctx) => {
      const business = await ctx.db
        .query("businesses")
        .filter((q) => q.eq(q.field("userId"), "owner-re"))
        .first();
      return ctx.db.insert("vouchers", {
        businessId: business!._id,
        userId: "owner-re",
        title: "Future",
        description: "Future voucher",
        provider: "manual",
        discount: { kind: "custom", customText: "future" },
        provisioning: { status: "not_required" },
        voucherValidFrom: FUTURE + 1000,
        voucherValidTo: FUTURE + 2000,
      });
    });
    const futureClaimId = await t.run(async (ctx) =>
      ctx.db.insert("claims", {
        customerId: "customer-re3",
        voucherId: futureVoucherId,
        claimedAt: NOW,
      }),
    );

    await expect(
      t.mutation(api.functions.redemptionEvents.burnManualVoucher, {
        voucherId: futureVoucherId,
        claimId: futureClaimId,
        businessId,
        now: NOW + 1,
      }),
    ).rejects.toThrow();
  });

  test("throws when businessId does not match voucher's business", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, claimId } = await seedData(t);

    // Create another business
    const otherBusinessId = await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Tech",
        category: "Technology",
        slug: `tech-re-${Math.random()}`,
      });
      return ctx.db.insert("businesses", {
        userId: "owner-other",
        name: "Other Shop",
        slug: `other-re-${Math.random()}`,
        description: "Other",
        websiteUrl: "https://other.com",
        industryId,
        address: "2 St",
        latitude: 51.0,
        longitude: -0.2,
      });
    });

    await expect(
      t.mutation(api.functions.redemptionEvents.burnManualVoucher, {
        voucherId,
        claimId,
        businessId: otherBusinessId,
        now: NOW + 1,
      }),
    ).rejects.toThrow();
  });

  test("throws when claim does not belong to the voucher", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, businessId } = await seedData(t);

    // Create a claim for a different voucher
    const otherClaimId = await t.run(async (ctx) => {
      const otherVoucherId = await ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-re",
        title: "Other",
        description: "Other",
        provider: "manual",
        discount: { kind: "custom", customText: "other" },
        provisioning: { status: "not_required" },
        voucherValidFrom: NOW - 1000,
        voucherValidTo: FUTURE,
      });
      return ctx.db.insert("claims", {
        customerId: "customer-other2",
        voucherId: otherVoucherId,
        claimedAt: NOW,
      });
    });

    await expect(
      t.mutation(api.functions.redemptionEvents.burnManualVoucher, {
        voucherId,
        claimId: otherClaimId,
        businessId,
        now: NOW + 1,
      }),
    ).rejects.toThrow();
  });
});

// ── getRedemptionEventByClaim ──────────────────────────────────────────────────

describe("getRedemptionEventByClaim", () => {
  test("returns null when no redemptionEvent exists", async () => {
    const t = convexTest(schema, modules);
    const { claimId } = await seedData(t);

    const event = await t.query(
      api.functions.redemptionEvents.getRedemptionEventByClaim,
      { claimId },
    );
    expect(event).toBeNull();
  });

  test("returns event after burnManualVoucher", async () => {
    const t = convexTest(schema, modules);
    const { voucherId, claimId, businessId } = await seedData(t);

    await t.mutation(api.functions.redemptionEvents.burnManualVoucher, {
      voucherId,
      claimId,
      businessId,
      now: NOW + 1,
    });

    const event = await t.query(
      api.functions.redemptionEvents.getRedemptionEventByClaim,
      { claimId },
    );
    expect(event).not.toBeNull();
    expect(event!.idempotencyKey).toBe(`manual:${claimId}`);
  });
});

// ── getWallet — redeemed state ────────────────────────────────────────────────

describe("getWallet — redeemed state", () => {
  test("wallet entry shows isRedeemed:false before burn", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-wallet-re" });

    const businessId = await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Food",
        category: "Food & Drink",
        slug: `food-wallet-re-${Math.random()}`,
      });
      return ctx.db.insert("businesses", {
        userId: "owner-wallet-re",
        name: "Wallet RE Shop",
        slug: `wallet-re-shop-${Math.random()}`,
        description: "Test",
        websiteUrl: "https://wallet-re.com",
        industryId,
        address: "1 St",
        latitude: 50.8,
        longitude: -0.1,
      });
    });
    const voucherId = await t.run(async (ctx) =>
      ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-wallet-re",
        title: "Free item",
        description: "Free item",
        provider: "manual",
        discount: { kind: "free_item", itemName: "coffee" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      }),
    );
    await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });

    const wallet = await customerT.query(api.functions.claims.getWallet, {});
    expect(wallet.ok).toBe(true);
    if (!wallet.ok) return;
    expect(wallet.entries).toHaveLength(1);
    expect(wallet.entries[0]!.isRedeemed).toBe(false);
    expect(wallet.entries[0]!.provider).toBe("manual");
  });

  test("wallet entry shows isRedeemed:true after burn", async () => {
    const t = convexTest(schema, modules);
    const customerT = t.withIdentity({ subject: "customer-wallet-re2" });

    const businessId = await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Food",
        category: "Food & Drink",
        slug: `food-wallet-re2-${Math.random()}`,
      });
      return ctx.db.insert("businesses", {
        userId: "owner-wallet-re2",
        name: "Wallet RE2 Shop",
        slug: `wallet-re2-shop-${Math.random()}`,
        description: "Test",
        websiteUrl: "https://wallet-re2.com",
        industryId,
        address: "1 St",
        latitude: 50.8,
        longitude: -0.1,
      });
    });
    const voucherId = await t.run(async (ctx) =>
      ctx.db.insert("vouchers", {
        businessId,
        userId: "owner-wallet-re2",
        title: "Free item 2",
        description: "Free item",
        provider: "manual",
        discount: { kind: "free_item", itemName: "tea" },
        provisioning: { status: "not_required" },
        voucherValidFrom: 1,
        voucherValidTo: 9_999_999_999_999,
      }),
    );
    const claimId = await customerT.mutation(api.functions.claims.claimVoucher, { voucherId });

    // Burn it
    await t.mutation(api.functions.redemptionEvents.burnManualVoucher, {
      voucherId,
      claimId: claimId!,
      businessId,
      now: Date.now(),
    });

    const wallet = await customerT.query(api.functions.claims.getWallet, {});
    expect(wallet.ok).toBe(true);
    if (!wallet.ok) return;
    expect(wallet.entries).toHaveLength(1);
    expect(wallet.entries[0]!.isRedeemed).toBe(true);
  });
});
