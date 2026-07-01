/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

const NOW = 1_700_000_000_000;

async function seedSquareBusiness(ctx: any): Promise<{
  businessId: Id<"businesses">;
  connectionId: Id<"posConnections">;
}> {
  const industryId = await ctx.db.insert("industries", {
    name: "Food",
    category: "Food & Drink",
    slug: `food-sqr-${Math.random()}`,
  });
  const businessId: Id<"businesses"> = await ctx.db.insert("businesses", {
    userId: "user_sqr",
    name: "SQR Shop",
    slug: `sqr-shop-${Math.random()}`,
    description: "Test",
    websiteUrl: "https://sqr.com",
    industryId,
    address: "1 St",
    latitude: 50.8,
    longitude: -0.1,
  });
  const connectionId: Id<"posConnections"> = await ctx.db.insert("posConnections", {
    businessId,
    provider: "square",
    status: "connected",
    externalMerchantId: `merchant-sqr-${Math.random()}`,
    scopes: ["ORDERS_READ"],
    encryptedTokens: "encrypted:test",
    encryptionKeyVersion: "v1",
    tokenExpiresAt: NOW + 86_400_000,
    connectedAt: NOW,
  });
  return { businessId, connectionId };
}

async function insertProvisionedVoucher(
  ctx: any,
  businessId: Id<"businesses">,
  catalogId: string,
): Promise<Id<"vouchers">> {
  return ctx.db.insert("vouchers", {
    businessId,
    userId: "user_sqr",
    title: "20% off",
    description: "Test discount",
    provider: "square",
    discount: { kind: "percentage", value: 20, currency: "GBP" },
    provisioning: {
      status: "provisioned",
      externalId: catalogId,
      provisionedAt: NOW - 1000,
    },
    voucherValidFrom: NOW - 86_400_000,
    voucherValidTo: NOW + 86_400_000,
  });
}

// ── upsertSquareRedemptionEvents — core idempotency ───────────────────────────

describe("upsertSquareRedemptionEvents", () => {
  test("creates a redemptionEvent for an order matching our catalog ID", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedSquareBusiness);
    await t.run((ctx) => insertProvisionedVoucher(ctx, businessId, "CAT_001"));

    await t.mutation(internal.functions.squareReconciliation.upsertSquareRedemptionEvents, {
      businessId,
      events: [
        {
          idempotencyKey: "square:ORDER_001:CAT_001",
          orderId: "ORDER_001",
          catalogDiscountId: "CAT_001",
          amountDiscounted: 500,
          occurredAt: NOW,
        },
      ],
      recordedAt: NOW + 1,
    });

    const events = await t.run(async (ctx) =>
      ctx.db.query("redemptionEvents").collect(),
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.source).toBe("square");
    expect(events[0]!.trustTier).toBe("square");
    expect(events[0]!.providerOrderRef).toBe("ORDER_001");
    expect(events[0]!.amountDiscounted).toBe(500);
    expect(events[0]!.idempotencyKey).toBe("square:ORDER_001:CAT_001");
    expect(events[0]!.businessId).toBe(businessId);
  });

  test("stores no claimId or customerId on Square events", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedSquareBusiness);
    await t.run((ctx) => insertProvisionedVoucher(ctx, businessId, "CAT_002"));

    await t.mutation(internal.functions.squareReconciliation.upsertSquareRedemptionEvents, {
      businessId,
      events: [
        {
          idempotencyKey: "square:ORDER_002:CAT_002",
          orderId: "ORDER_002",
          catalogDiscountId: "CAT_002",
          occurredAt: NOW,
        },
      ],
      recordedAt: NOW + 1,
    });

    const event = await t.run(async (ctx) =>
      ctx.db.query("redemptionEvents").first(),
    );
    expect(event!.claimId).toBeUndefined();
    expect(event!.customerId).toBeUndefined();
  });

  test("is idempotent — second call with same key is a silent no-op", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedSquareBusiness);
    await t.run((ctx) => insertProvisionedVoucher(ctx, businessId, "CAT_003"));

    const event = {
      idempotencyKey: "square:ORDER_003:CAT_003",
      orderId: "ORDER_003",
      catalogDiscountId: "CAT_003",
      amountDiscounted: 200,
      occurredAt: NOW,
    };

    await t.mutation(internal.functions.squareReconciliation.upsertSquareRedemptionEvents, {
      businessId,
      events: [event],
      recordedAt: NOW + 1,
    });
    // Simulate same event arriving via the other path (webhook or poll)
    await t.mutation(internal.functions.squareReconciliation.upsertSquareRedemptionEvents, {
      businessId,
      events: [event],
      recordedAt: NOW + 2,
    });

    const all = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionEvents")
        .withIndex("by_idempotency", (q) =>
          q.eq("idempotencyKey", "square:ORDER_003:CAT_003"),
        )
        .collect(),
    );
    expect(all).toHaveLength(1);
  });

  test("skips events where catalogDiscountId does not match any provisioned voucher", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedSquareBusiness);

    await t.mutation(internal.functions.squareReconciliation.upsertSquareRedemptionEvents, {
      businessId,
      events: [
        {
          idempotencyKey: "square:ORDER_004:UNKNOWN_DISC",
          orderId: "ORDER_004",
          catalogDiscountId: "UNKNOWN_DISC",
          occurredAt: NOW,
        },
      ],
      recordedAt: NOW + 1,
    });

    const all = await t.run(async (ctx) =>
      ctx.db.query("redemptionEvents").collect(),
    );
    expect(all).toHaveLength(0);
  });

  test("webhook and poll producing the same event collapses to one row", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedSquareBusiness);
    const voucherId = await t.run((ctx) =>
      insertProvisionedVoucher(ctx, businessId, "CAT_005"),
    );

    const sharedEvent = {
      idempotencyKey: "square:ORDER_005:CAT_005",
      orderId: "ORDER_005",
      catalogDiscountId: "CAT_005",
      amountDiscounted: 1000,
      occurredAt: NOW,
    };

    // Webhook path
    await t.mutation(internal.functions.squareReconciliation.upsertSquareRedemptionEvents, {
      businessId,
      events: [sharedEvent],
      recordedAt: NOW + 1,
    });

    // Poll path (same event, different recordedAt)
    await t.mutation(internal.functions.squareReconciliation.upsertSquareRedemptionEvents, {
      businessId,
      events: [sharedEvent],
      recordedAt: NOW + 60_000,
    });

    const all = await t.run(async (ctx) =>
      ctx.db.query("redemptionEvents").collect(),
    );
    expect(all).toHaveLength(1);
    expect(all[0]!.voucherId).toBe(voucherId);
  });

  test("derived count — events per voucher reflects upserted events", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedSquareBusiness);
    const voucherId = await t.run((ctx) =>
      insertProvisionedVoucher(ctx, businessId, "CAT_006"),
    );

    // Two different orders for the same voucher
    await t.mutation(internal.functions.squareReconciliation.upsertSquareRedemptionEvents, {
      businessId,
      events: [
        {
          idempotencyKey: "square:ORDER_006a:CAT_006",
          orderId: "ORDER_006a",
          catalogDiscountId: "CAT_006",
          amountDiscounted: 300,
          occurredAt: NOW,
        },
        {
          idempotencyKey: "square:ORDER_006b:CAT_006",
          orderId: "ORDER_006b",
          catalogDiscountId: "CAT_006",
          amountDiscounted: 300,
          occurredAt: NOW + 3600,
        },
      ],
      recordedAt: NOW + 1,
    });

    const count = await t.run(async (ctx) => {
      const events = await ctx.db
        .query("redemptionEvents")
        .withIndex("by_voucher", (q) => q.eq("voucherId", voucherId))
        .collect();
      return events.length;
    });

    expect(count).toBe(2);
  });
});

// ── advanceLastReconciledAt ────────────────────────────────────────────────────

describe("advanceLastReconciledAt", () => {
  test("patches lastReconciledAt on the connection", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await t.run(seedSquareBusiness);

    await t.mutation(internal.functions.squareReconciliation.advanceLastReconciledAt, {
      connectionId,
      reconciledAt: NOW + 100,
    });

    const conn = await t.run((ctx) => ctx.db.get(connectionId));
    expect(conn!.lastReconciledAt).toBe(NOW + 100);
  });

  test("advances an already-set lastReconciledAt to a newer timestamp", async () => {
    const t = convexTest(schema, modules);
    const { connectionId } = await t.run(seedSquareBusiness);

    await t.mutation(internal.functions.squareReconciliation.advanceLastReconciledAt, {
      connectionId,
      reconciledAt: NOW + 100,
    });
    await t.mutation(internal.functions.squareReconciliation.advanceLastReconciledAt, {
      connectionId,
      reconciledAt: NOW + 200,
    });

    const conn = await t.run((ctx) => ctx.db.get(connectionId));
    expect(conn!.lastReconciledAt).toBe(NOW + 200);
  });
});

// ── getOurCatalogIds ──────────────────────────────────────────────────────────

describe("getOurCatalogIds", () => {
  test("returns catalog IDs for provisioned Square vouchers of a business", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedSquareBusiness);
    await t.run((ctx) => insertProvisionedVoucher(ctx, businessId, "CAT_QUERY_1"));
    await t.run((ctx) => insertProvisionedVoucher(ctx, businessId, "CAT_QUERY_2"));

    const ids = await t.query(
      internal.functions.squareReconciliation.getOurCatalogIds,
      { businessId },
    );
    expect(ids).toContain("CAT_QUERY_1");
    expect(ids).toContain("CAT_QUERY_2");
    expect(ids).toHaveLength(2);
  });

  test("excludes vouchers with no externalId (pending/failed)", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedSquareBusiness);

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_sqr",
        title: "Pending",
        description: "Not yet provisioned",
        provider: "square",
        discount: { kind: "percentage", value: 10, currency: "GBP" },
        provisioning: { status: "pending" },
        voucherValidFrom: NOW - 1000,
        voucherValidTo: NOW + 86_400_000,
      });
    });

    const ids = await t.query(
      internal.functions.squareReconciliation.getOurCatalogIds,
      { businessId },
    );
    expect(ids).toHaveLength(0);
  });

  test("excludes deleted vouchers", async () => {
    const t = convexTest(schema, modules);
    const { businessId } = await t.run(seedSquareBusiness);

    await t.run(async (ctx) => {
      const vId = await insertProvisionedVoucher(ctx, businessId, "CAT_DELETED");
      await ctx.db.patch(vId, { deletedAt: NOW - 100 });
    });

    const ids = await t.query(
      internal.functions.squareReconciliation.getOurCatalogIds,
      { businessId },
    );
    expect(ids).toHaveLength(0);
  });
});

// ── getConnectionByMerchantId ─────────────────────────────────────────────────

describe("getConnectionByMerchantId", () => {
  test("returns connected connection for a known merchant ID", async () => {
    const t = convexTest(schema, modules);

    const merchantId = `merchant-test-${Math.random()}`;
    const { connectionId } = await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Retail",
        category: "Retail",
        slug: `retail-${Math.random()}`,
      });
      const businessId = await ctx.db.insert("businesses", {
        userId: "user_cid",
        name: "CID Shop",
        slug: `cid-shop-${Math.random()}`,
        description: "Test",
        websiteUrl: "https://cid.com",
        industryId,
        address: "1 St",
        latitude: 50.8,
        longitude: -0.1,
      });
      const connectionId = await ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "connected",
        externalMerchantId: merchantId,
        scopes: ["ORDERS_READ"],
        encryptedTokens: "encrypted:test",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: NOW + 86_400_000,
        connectedAt: NOW,
      });
      return { connectionId };
    });

    const conn = await t.query(
      internal.functions.squareReconciliation.getConnectionByMerchantId,
      { externalMerchantId: merchantId },
    );
    expect(conn).not.toBeNull();
    expect(conn!._id).toBe(connectionId);
  });

  test("returns null for an unknown merchant ID", async () => {
    const t = convexTest(schema, modules);
    const conn = await t.query(
      internal.functions.squareReconciliation.getConnectionByMerchantId,
      { externalMerchantId: "UNKNOWN_MERCHANT" },
    );
    expect(conn).toBeNull();
  });

  test("returns null for a revoked connection", async () => {
    const t = convexTest(schema, modules);
    const merchantId = `revoked-merchant-${Math.random()}`;

    await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Retail",
        category: "Retail",
        slug: `retail-r-${Math.random()}`,
      });
      const businessId = await ctx.db.insert("businesses", {
        userId: "user_rev",
        name: "Rev Shop",
        slug: `rev-shop-${Math.random()}`,
        description: "Test",
        websiteUrl: "https://rev.com",
        industryId,
        address: "1 St",
        latitude: 50.8,
        longitude: -0.1,
      });
      await ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "revoked",
        externalMerchantId: merchantId,
        scopes: ["ORDERS_READ"],
        tokenExpiresAt: NOW - 1000,
        connectedAt: NOW - 2000,
      });
    });

    const conn = await t.query(
      internal.functions.squareReconciliation.getConnectionByMerchantId,
      { externalMerchantId: merchantId },
    );
    expect(conn).toBeNull();
  });
});
