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
    slug: `food-vf-${Math.random()}`,
  });
  const businessId = await ctx.db.insert("businesses", {
    userId: "user_vf",
    name: "VF Shop",
    slug: `vf-shop-${Math.random()}`,
    description: "Test",
    websiteUrl: "https://vf.com",
    industryId,
    address: "1 St",
    latitude: 50.8,
    longitude: -0.1,
  });
  return businessId;
}

describe("isActiveVoucher filter — getActiveVouchersByBusiness", () => {
  test("returns active voucher within validity window", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vf",
        title: "Active",
        description: "Live now",
        voucherFormat: "generated_text",
        voucherValidFrom: now - 10_000,
        voucherValidTo: now + 10_000,
      });
    });

    const result = await t.query(api.functions.vouchers.getActiveVouchersByBusiness, { businessId });
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("Active");
  });

  test("excludes deleted vouchers", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vf",
        title: "Deleted",
        description: "Soft-deleted",
        voucherFormat: "generated_text",
        voucherValidFrom: now - 10_000,
        voucherValidTo: now + 10_000,
        deletedAt: now - 5_000,
      });
    });

    const result = await t.query(api.functions.vouchers.getActiveVouchersByBusiness, { businessId });
    expect(result).toHaveLength(0);
  });

  test("excludes flagged vouchers", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vf",
        title: "Flagged",
        description: "Admin-flagged",
        voucherFormat: "generated_text",
        voucherValidFrom: now - 10_000,
        voucherValidTo: now + 10_000,
        flaggedAt: now - 5_000,
      });
    });

    const result = await t.query(api.functions.vouchers.getActiveVouchersByBusiness, { businessId });
    expect(result).toHaveLength(0);
  });

  test("excludes expired vouchers (validTo < now)", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vf",
        title: "Expired",
        description: "Past its end date",
        voucherFormat: "generated_text",
        voucherValidFrom: now - 20_000,
        voucherValidTo: now - 10_000,
      });
    });

    const result = await t.query(api.functions.vouchers.getActiveVouchersByBusiness, { businessId });
    expect(result).toHaveLength(0);
  });

  test("excludes scheduled vouchers (validFrom > now)", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vf",
        title: "Scheduled",
        description: "Not started yet",
        voucherFormat: "generated_text",
        voucherValidFrom: now + 10_000,
        voucherValidTo: now + 60 * 24 * 60 * 60 * 1000,
      });
    });

    const result = await t.query(api.functions.vouchers.getActiveVouchersByBusiness, { businessId });
    expect(result).toHaveLength(0);
  });
});

describe("isActiveVoucher filter — getExpiringVouchersByBusiness", () => {
  test("returns active voucher expiring within 30 days", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vf",
        title: "Expiring Soon",
        description: "Expires in 20 days",
        voucherFormat: "generated_text",
        voucherValidFrom: now - 1_000,
        voucherValidTo: now + 20 * 24 * 60 * 60 * 1000,
      });
    });

    const result = await t.query(api.functions.vouchers.getExpiringVouchersByBusiness, { businessId });
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("Expiring Soon");
  });

  test("excludes flagged vouchers expiring within 30 days", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vf",
        title: "Flagged Expiring",
        description: "Flagged but expiring soon",
        voucherFormat: "generated_text",
        voucherValidFrom: now - 1_000,
        voucherValidTo: now + 20 * 24 * 60 * 60 * 1000,
        flaggedAt: now - 500,
      });
    });

    const result = await t.query(api.functions.vouchers.getExpiringVouchersByBusiness, { businessId });
    expect(result).toHaveLength(0);
  });

  test("excludes vouchers expiring after 30 days", async () => {
    const t = convexTest(schema, modules);
    const businessId = await t.run(seedBusiness);
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("vouchers", {
        businessId,
        userId: "user_vf",
        title: "Far Future",
        description: "Expires in 60 days",
        voucherFormat: "generated_text",
        voucherValidFrom: now - 1_000,
        voucherValidTo: now + 60 * 24 * 60 * 60 * 1000,
      });
    });

    const result = await t.query(api.functions.vouchers.getExpiringVouchersByBusiness, { businessId });
    expect(result).toHaveLength(0);
  });
});
