/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../../convex/**/*.{js,ts}", { eager: false });

describe("schema migration — flaggedAt, userId, new tables", () => {
  test("businesses and vouchers use userId (not clerkUserId)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Retail",
        category: "Shopping",
        slug: "retail",
      });

      const businessId = await ctx.db.insert("businesses", {
        userId: "user_abc",
        name: "Test Shop",
        slug: "test-shop",
        description: "A test shop",
        websiteUrl: "https://example.com",
        industryId,
        address: "1 High St, Brighton",
        latitude: 50.82,
        longitude: -0.14,
      });

      const business = await ctx.db.get(businessId);
      expect(business?.userId).toBe("user_abc");
      expect((business as Record<string, unknown>).clerkUserId).toBeUndefined();

      const voucherId = await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_abc",
        title: "20% off",
        description: "Save 20%",
        voucherFormat: "generated_text",
        voucherValidFrom: 1000,
        voucherValidTo: 9999999999999,
      });

      const voucher = await ctx.db.get(voucherId);
      expect(voucher?.userId).toBe("user_abc");
      expect((voucher as Record<string, unknown>).clerkUserId).toBeUndefined();
    });
  });

  test("auditLog uses userId (not adminClerkUserId)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const logId = await ctx.db.insert("auditLog", {
        userId: "admin_xyz",
        action: "flag_business",
        targetType: "business",
        targetId: "some-id",
        createdAt: Date.now(),
      });

      const log = await ctx.db.get(logId);
      expect(log?.userId).toBe("admin_xyz");
      expect(
        (log as Record<string, unknown>).adminClerkUserId
      ).toBeUndefined();
    });
  });

  test("businesses and vouchers have flaggedAt field", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Food",
        category: "Food & Drink",
        slug: "food",
      });

      const businessId = await ctx.db.insert("businesses", {
        userId: "user_1",
        name: "Cafe",
        slug: "cafe",
        description: "A cafe",
        websiteUrl: "https://cafe.com",
        industryId,
        address: "2 Main St",
        latitude: 50.8,
        longitude: -0.1,
        flaggedAt: 1234567890,
      });

      const business = await ctx.db.get(businessId);
      expect(business?.flaggedAt).toBe(1234567890);
      expect(business?.deletedAt).toBeUndefined();

      const voucherId = await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_1",
        title: "Free coffee",
        description: "One free coffee",
        voucherFormat: "generated_text",
        voucherValidFrom: 1000,
        voucherValidTo: 9999999999999,
        flaggedAt: 9999,
      });

      const voucher = await ctx.db.get(voucherId);
      expect(voucher?.flaggedAt).toBe(9999);
      expect(voucher?.deletedAt).toBeUndefined();
    });
  });

  test("flagBusiness sets flaggedAt but not deletedAt", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });
    const ownerT = t.withIdentity({ subject: "owner_1" });

    await t.run(async (ctx) => {
      await ctx.db.insert("industries", {
        name: "Food",
        category: "Food & Drink",
        slug: "food",
      });
    });

    const industryId = (
      await t.run(async (ctx) =>
        ctx.db.query("industries").first()
      )
    )!._id;

    const businessId = await ownerT.mutation(
      api.functions.businesses.createBusiness,
      {
        name: "My Cafe",
        description: "A cafe",
        websiteUrl: "https://mycafe.com",
        industryId,
        address: "3 Beach Rd",
        latitude: 50.8,
        longitude: -0.1,
      }
    );

    await adminT.mutation(api.functions.admin.flagBusiness, {
      businessId: businessId!._id,
    });

    const business = await t.run(async (ctx) => ctx.db.get(businessId!._id));
    expect(business?.flaggedAt).toBeDefined();
    expect(business?.deletedAt).toBeUndefined();
  });

  test("reinstateBusiness clears flaggedAt", async () => {
    const t = convexTest(schema, modules);
    const adminT = t.withIdentity({ subject: "admin_1", role: "admin" });
    const ownerT = t.withIdentity({ subject: "owner_1" });

    await t.run(async (ctx) => {
      await ctx.db.insert("industries", {
        name: "Retail",
        category: "Shopping",
        slug: "retail",
      });
    });

    const industryId = (
      await t.run(async (ctx) =>
        ctx.db.query("industries").first()
      )
    )!._id;

    const businessId = await ownerT.mutation(
      api.functions.businesses.createBusiness,
      {
        name: "My Shop",
        description: "A shop",
        websiteUrl: "https://myshop.com",
        industryId,
        address: "4 North St",
        latitude: 50.83,
        longitude: -0.13,
      }
    );

    await adminT.mutation(api.functions.admin.flagBusiness, {
      businessId: businessId!._id,
    });

    let business = await t.run(async (ctx) => ctx.db.get(businessId!._id));
    expect(business?.flaggedAt).toBeDefined();

    await adminT.mutation(api.functions.admin.reinstateBusiness, {
      businessId: businessId!._id,
    });

    business = await t.run(async (ctx) => ctx.db.get(businessId!._id));
    expect(business?.flaggedAt).toBeUndefined();
  });

  test("getBusinessByIdWithVouchers excludes flagged businesses", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Food",
        category: "Food & Drink",
        slug: "food",
      });

      const businessId = await ctx.db.insert("businesses", {
        userId: "user_2",
        name: "Flagged Cafe",
        slug: "flagged-cafe",
        description: "Flagged",
        websiteUrl: "https://example.com",
        industryId,
        address: "5 South St",
        latitude: 50.8,
        longitude: -0.1,
        flaggedAt: Date.now(),
      });

      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_2",
        title: "Free item",
        description: "Get one free",
        voucherFormat: "generated_text",
        voucherValidFrom: 1,
        voucherValidTo: 9999999999999,
      });

      const result = await ctx.db.get(businessId);
      // Business should be flagged
      expect(result?.flaggedAt).toBeDefined();
    });

    // getBusinessByIdWithVouchers should return null for flagged business
    const businesses = await t.run(async (ctx) =>
      ctx.db.query("businesses").first()
    );
    const result = await t.query(
      api.functions.explore.getBusinessByIdWithVouchers,
      { businessId: businesses!._id }
    );
    expect(result).toBeNull();
  });

  test("getBusinessesWithVouchers excludes flagged businesses", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Retail",
        category: "Shopping",
        slug: "retail-2",
      });

      const flaggedBusinessId = await ctx.db.insert("businesses", {
        userId: "user_3",
        name: "Flagged Shop",
        slug: "flagged-shop",
        description: "This one is flagged",
        websiteUrl: "https://example.com",
        industryId,
        address: "6 East St",
        latitude: 50.82,
        longitude: -0.12,
        flaggedAt: Date.now(),
      });

      await ctx.db.insert("vouchers", {
        businessId: flaggedBusinessId,
        userId: "user_3",
        title: "10% off",
        description: "Save 10%",
        voucherFormat: "generated_text",
        voucherValidFrom: 1,
        voucherValidTo: 9999999999999,
      });

      const goodBusinessId = await ctx.db.insert("businesses", {
        userId: "user_4",
        name: "Good Shop",
        slug: "good-shop",
        description: "Not flagged",
        websiteUrl: "https://good.com",
        industryId,
        address: "7 West St",
        latitude: 50.81,
        longitude: -0.11,
      });

      await ctx.db.insert("vouchers", {
        businessId: goodBusinessId,
        userId: "user_4",
        title: "15% off",
        description: "Save 15%",
        voucherFormat: "generated_text",
        voucherValidFrom: 1,
        voucherValidTo: 9999999999999,
      });
    });

    const results = await t.query(
      api.functions.explore.getBusinessesWithVouchers,
      {}
    );
    expect(results.length).toBe(1);
    expect(results[0]!.name).toBe("Good Shop");
  });

  test("claims table supports insert and compound index lookup", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Food",
        category: "Food & Drink",
        slug: "food-3",
      });
      const businessId = await ctx.db.insert("businesses", {
        userId: "user_5",
        name: "Biz",
        slug: "biz",
        description: "Biz desc",
        websiteUrl: "https://biz.com",
        industryId,
        address: "8 St",
        latitude: 50.8,
        longitude: -0.1,
      });
      const voucherId = await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_5",
        title: "Offer",
        description: "Desc",
        voucherFormat: "generated_text",
        voucherValidFrom: 1,
        voucherValidTo: 9999999999999,
      });

      const claimId = await ctx.db.insert("claims", {
        customerId: "customer_1",
        voucherId,
        claimedAt: 111111,
      });

      const claim = await ctx.db.get(claimId);
      expect(claim?.customerId).toBe("customer_1");
      expect(claim?.voucherId).toBe(voucherId);
      expect(claim?.claimedAt).toBe(111111);

      // Query via compound index
      const found = await ctx.db
        .query("claims")
        .withIndex("by_customer_voucher", (q) =>
          q.eq("customerId", "customer_1").eq("voucherId", voucherId)
        )
        .first();
      expect(found?._id).toBe(claimId);
    });
  });

  test("reveals table supports insert and index lookup", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Food",
        category: "Food & Drink",
        slug: "food-4",
      });
      const businessId = await ctx.db.insert("businesses", {
        userId: "user_6",
        name: "Biz2",
        slug: "biz2",
        description: "Biz2 desc",
        websiteUrl: "https://biz2.com",
        industryId,
        address: "9 St",
        latitude: 50.8,
        longitude: -0.1,
      });
      const voucherId = await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_6",
        title: "Offer2",
        description: "Desc2",
        voucherFormat: "generated_text",
        voucherValidFrom: 1,
        voucherValidTo: 9999999999999,
      });
      const claimId = await ctx.db.insert("claims", {
        customerId: "customer_2",
        voucherId,
        claimedAt: 222222,
      });

      const revealId = await ctx.db.insert("reveals", {
        claimId,
        voucherCode: "ABC123XYZ789",
        revealedAt: 333333,
        expiresAt: 333333 + 7200000,
      });

      const reveal = await ctx.db.get(revealId);
      expect(reveal?.voucherCode).toBe("ABC123XYZ789");
      expect(reveal?.redeemedAt).toBeUndefined();

      const found = await ctx.db
        .query("reveals")
        .withIndex("by_claim", (q) => q.eq("claimId", claimId))
        .first();
      expect(found?._id).toBe(revealId);
    });
  });

  test("posConnections table supports insert", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Retail",
        category: "Shopping",
        slug: "retail-3",
      });
      const businessId = await ctx.db.insert("businesses", {
        userId: "user_7",
        name: "POS Biz",
        slug: "pos-biz",
        description: "Has POS",
        websiteUrl: "https://posbiz.com",
        industryId,
        address: "10 St",
        latitude: 50.8,
        longitude: -0.1,
      });

      const connId = await ctx.db.insert("posConnections", {
        businessId,
        provider: "square",
        credentials: "encrypted-token-ref",
        connectedAt: 444444,
      });

      const conn = await ctx.db.get(connId);
      expect(conn?.provider).toBe("square");
      expect(conn?.businessId).toBe(businessId);

      const conn2Id = await ctx.db.insert("posConnections", {
        businessId,
        provider: "zettle",
        credentials: "another-encrypted-ref",
        connectedAt: 555555,
      });

      const conn2 = await ctx.db.get(conn2Id);
      expect(conn2?.provider).toBe("zettle");
    });
  });

  test("subscriptions table supports insert and indexes", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const industryId = await ctx.db.insert("industries", {
        name: "Retail",
        category: "Shopping",
        slug: "retail-4",
      });
      const businessId = await ctx.db.insert("businesses", {
        userId: "user_8",
        name: "Sub Biz",
        slug: "sub-biz",
        description: "Has subscription",
        websiteUrl: "https://subbiz.com",
        industryId,
        address: "11 St",
        latitude: 50.8,
        longitude: -0.1,
      });

      const subId = await ctx.db.insert("subscriptions", {
        businessId,
        stripeCustomerId: "cus_abc123",
        stripeSubscriptionId: "sub_xyz789",
        status: "trialing",
        trialEnd: 666666,
        currentPeriodEnd: 777777,
        priceId: "price_monthly",
      });

      const sub = await ctx.db.get(subId);
      expect(sub?.stripeCustomerId).toBe("cus_abc123");
      expect(sub?.status).toBe("trialing");

      const byBusiness = await ctx.db
        .query("subscriptions")
        .withIndex("by_business", (q) => q.eq("businessId", businessId))
        .first();
      expect(byBusiness?._id).toBe(subId);

      const byCustomer = await ctx.db
        .query("subscriptions")
        .withIndex("by_stripe_customer", (q) =>
          q.eq("stripeCustomerId", "cus_abc123")
        )
        .first();
      expect(byCustomer?._id).toBe(subId);
    });
  });
});
