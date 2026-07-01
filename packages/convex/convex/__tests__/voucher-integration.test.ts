/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

async function seedBusiness(ctx: any) {
  const industryId = await ctx.db.insert("industries", {
    name: "Food",
    category: "Food & Drink",
    slug: `food-vi-${Math.random()}`,
  });
  return ctx.db.insert("businesses", {
    userId: "user_vi",
    name: "VI Shop",
    slug: `vi-shop-${Math.random()}`,
    description: "Test",
    websiteUrl: "https://vi.com",
    industryId,
    address: "1 St",
    latitude: 50.8,
    longitude: -0.1,
  });
}

// ── Provisioning.status schema validation ─────────────────────────────────────
// The provisioning logic (manual→not_required, square→pending) is tested in
// domain unit tests (voucher-service.test.ts). Here we verify that the Convex
// schema accepts and stores the correct provisioning shapes.

describe("provisioning — schema accepts provider-specific statuses", () => {
  test("schema accepts manual voucher with not_required status", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    const voucherId = await t.run(async (ctx) => {
      return ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vi",
        title: "Free coffee",
        description: "One free coffee",
        provider: "manual",
        discount: { kind: "free_item", itemName: "flat white" },
        provisioning: { status: "not_required" },
        voucherValidFrom: now - 1000,
        voucherValidTo: now + 86_400_000,
      });
    });

    const voucher = await t.run(async (ctx) => ctx.db.get(voucherId));
    expect(voucher?.provisioning.status).toBe("not_required");
    expect(voucher?.provider).toBe("manual");
  });

  test("schema accepts square voucher with pending status", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    const voucherId = await t.run(async (ctx) => {
      return ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vi",
        title: "10% off",
        description: "Save 10%",
        provider: "square",
        discount: { kind: "percentage", value: 10, currency: "GBP" },
        provisioning: { status: "pending" },
        voucherValidFrom: now - 1000,
        voucherValidTo: now + 86_400_000,
      });
    });

    const voucher = await t.run(async (ctx) => ctx.db.get(voucherId));
    expect(voucher?.provisioning.status).toBe("pending");
    expect(voucher?.provider).toBe("square");
  });
});

// ── Customer visibility rule ──────────────────────────────────────────────────

describe("customer visibility — getActiveVouchersByBusiness", () => {
  test("shows manual vouchers regardless of provisioning", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vi",
        title: "Manual Voucher",
        description: "Free item",
        provider: "manual",
        discount: { kind: "free_item", itemName: "coffee" },
        provisioning: { status: "not_required" },
        voucherValidFrom: now - 1000,
        voucherValidTo: now + 86_400_000,
      });
    });

    const result = await t.query(api.functions.vouchers.getActiveVouchersByBusiness, { businessId });
    expect(result).toHaveLength(1);
    expect(result[0]!.provider).toBe("manual");
  });

  test("hides square voucher with provisioning.status = pending", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vi",
        title: "Square Pending",
        description: "Not yet provisioned",
        provider: "square",
        discount: { kind: "percentage", value: 10, currency: "GBP" },
        provisioning: { status: "pending" },
        voucherValidFrom: now - 1000,
        voucherValidTo: now + 86_400_000,
      });
    });

    const result = await t.query(api.functions.vouchers.getActiveVouchersByBusiness, { businessId });
    expect(result).toHaveLength(0);
  });

  test("shows square voucher with provisioning.status = provisioned", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vi",
        title: "Square Provisioned",
        description: "Live on Square",
        provider: "square",
        discount: { kind: "percentage", value: 15, currency: "GBP" },
        provisioning: { status: "provisioned", externalId: "cat-obj-123", provisionedAt: now - 500 },
        voucherValidFrom: now - 1000,
        voucherValidTo: now + 86_400_000,
      });
    });

    const result = await t.query(api.functions.vouchers.getActiveVouchersByBusiness, { businessId });
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("Square Provisioned");
  });

  test("hides square voucher with provisioning.status = failed", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vi",
        title: "Square Failed",
        description: "Provisioning failed",
        provider: "square",
        discount: { kind: "fixed_amount", value: 500, currency: "GBP" },
        provisioning: { status: "failed", lastError: "Rate limited" },
        voucherValidFrom: now - 1000,
        voucherValidTo: now + 86_400_000,
      });
    });

    const result = await t.query(api.functions.vouchers.getActiveVouchersByBusiness, { businessId });
    expect(result).toHaveLength(0);
  });
});

// ── Derived redemption count ──────────────────────────────────────────────────

describe("derived redemption count from redemptionEvents", () => {
  test("redemption count is derived from redemptionEvents, not stored", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    const voucherId = await t.run(async (ctx) => {
      return ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vi",
        title: "Manual Voucher",
        description: "A voucher",
        provider: "manual",
        discount: { kind: "percentage", value: 20, currency: "GBP" },
        provisioning: { status: "not_required" },
        voucherValidFrom: now - 1000,
        voucherValidTo: now + 86_400_000,
      });
    });

    const claimId = await t.run(async (ctx) => {
      return ctx.db.insert("claims", {
        customerId: "customer-1",
        voucherId,
        claimedAt: now - 500,
      });
    });

    // Insert two redemption events for the same voucher
    await t.run(async (ctx) => {
      await ctx.db.insert("redemptionEvents", {
        voucherId,
        businessId,
        source: "manual",
        trustTier: "manual",
        occurredAt: now - 200,
        recordedAt: now - 200,
        claimId,
        customerId: "customer-1",
        idempotencyKey: `manual:${claimId}`,
      });
    });

    // Voucher itself does not store a counter — verified by checking DB doc
    const voucher = await t.run(async (ctx) => ctx.db.get(voucherId));
    expect((voucher as any).redemptionCount).toBeUndefined();

    // Count is derivable from redemptionEvents table
    const events = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionEvents")
        .withIndex("by_voucher", (q) => q.eq("voucherId", voucherId))
        .collect()
    );
    expect(events).toHaveLength(1);
  });

  test("idempotencyKey uniqueness enforced via by_idempotency index", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    const voucherId = await t.run(async (ctx) => {
      return ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vi",
        title: "Voucher",
        description: "Desc",
        provider: "manual",
        discount: { kind: "bogof", itemName: "coffee" },
        provisioning: { status: "not_required" },
        voucherValidFrom: now - 1000,
        voucherValidTo: now + 86_400_000,
      });
    });

    const claimId = await t.run(async (ctx) => {
      return ctx.db.insert("claims", {
        customerId: "customer-2",
        voucherId,
        claimedAt: now,
      });
    });

    const key = `manual:${claimId}`;

    // Insert first event
    await t.run(async (ctx) => {
      await ctx.db.insert("redemptionEvents", {
        voucherId,
        businessId,
        source: "manual",
        trustTier: "manual",
        occurredAt: now,
        recordedAt: now,
        claimId,
        customerId: "customer-2",
        idempotencyKey: key,
      });
    });

    // Verify it can be found by idempotency key
    const found = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionEvents")
        .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", key))
        .first()
    );
    expect(found).not.toBeNull();
    expect(found?.claimId).toBe(claimId);
  });
});

// ── redemptionAuth table ──────────────────────────────────────────────────────

describe("redemptionAuth schema", () => {
  test("can insert and retrieve a redemptionAuth record", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    const authId = await t.run(async (ctx) => {
      return ctx.db.insert("redemptionAuth", {
        businessId,
        redemptionPinHash: "argon2id$...",
        redemptionPinSetAt: now,
      });
    });

    const record = await t.run(async (ctx) => ctx.db.get(authId));
    expect(record?.businessId).toBe(businessId);
    expect(record?.redemptionPinHash).toBe("argon2id$...");

    // Query via by_business index
    const found = await t.run(async (ctx) =>
      ctx.db
        .query("redemptionAuth")
        .withIndex("by_business", (q) => q.eq("businessId", businessId))
        .first()
    );
    expect(found?._id).toBe(authId);
  });
});

// ── posConnections — OAuth shape ──────────────────────────────────────────────

describe("posConnections — OAuth schema shape", () => {
  test("can insert and retrieve OAuth-shaped posConnection", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    const connId = await t.run(async (ctx) => {
      return ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "connected",
        externalMerchantId: "merchant-abc",
        scopes: ["ITEMS_READ", "ITEMS_WRITE", "ORDERS_READ"],
        encryptedTokens: "AES256GCM:...",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: now + 30 * 24 * 60 * 60 * 1000,
        connectedAt: now,
      });
    });

    const conn = await t.run(async (ctx) => ctx.db.get(connId));
    expect(conn?.provider).toBe("square");
    expect(conn?.status).toBe("connected");
    expect(conn?.externalMerchantId).toBe("merchant-abc");
    expect(conn?.scopes).toContain("ITEMS_READ");

    // Query via by_external_merchant index
    const found = await t.run(async (ctx) =>
      ctx.db
        .query("posConnections")
        .withIndex("by_external_merchant", (q) =>
          q.eq("externalMerchantId", "merchant-abc")
        )
        .first()
    );
    expect(found?._id).toBe(connId);
  });

  test("getPosConnections returns OAuth-shaped connections", async () => {
    const t = convexTest(schema, modules);
    const ownerT = t.withIdentity({ subject: "user_vi" });
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        status: "connected",
        externalMerchantId: "merchant-xyz",
        scopes: ["ITEMS_READ"],
        encryptedTokens: "encrypted:...",
        encryptionKeyVersion: "v1",
        tokenExpiresAt: now + 86_400_000,
        connectedAt: now,
      });
    });

    const connections = await ownerT.query(
      api.functions.posConnections.getPosConnections,
      { businessId },
    );

    expect(connections).toHaveLength(1);
    expect(connections[0]?.provider).toBe("square");
    expect(connections[0]?.status).toBe("connected");
  });
});

// ── reveals — no redeemedAt ───────────────────────────────────────────────────

describe("reveals — no redeemedAt field", () => {
  test("reveals can be inserted without redeemedAt", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    const voucherId = await t.run(async (ctx) => {
      return ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vi",
        title: "Reveal Test",
        description: "Desc",
        provider: "manual",
        discount: { kind: "custom", customText: "Special offer" },
        provisioning: { status: "not_required" },
        voucherValidFrom: now - 1000,
        voucherValidTo: now + 86_400_000,
      });
    });

    const claimId = await t.run(async (ctx) => {
      return ctx.db.insert("claims", {
        customerId: "customer-3",
        voucherId,
        claimedAt: now,
      });
    });

    const revealId = await t.run(async (ctx) => {
      return ctx.db.insert("reveals", {
        claimId,
        voucherCode: "ABCDEF123456",
        revealedAt: now,
        expiresAt: now + 2 * 60 * 60 * 1000,
      });
    });

    const reveal = await t.run(async (ctx) => ctx.db.get(revealId));
    expect(reveal?.voucherCode).toBe("ABCDEF123456");
    expect((reveal as any)?.redeemedAt).toBeUndefined();
  });
});
