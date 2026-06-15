import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

export const getVouchersByBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    await requireAuth(ctx);
    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("flaggedAt"), undefined)
        )
      )
      .collect();

    return await Promise.all(
      vouchers.map(async (voucher) => ({
        ...voucher,
        voucherUrl: voucher.voucherStorageId
          ? await ctx.storage.getUrl(voucher.voucherStorageId)
          : null,
      }))
    );
  },
});

export const getActiveVouchersByBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const now = Date.now();
    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("flaggedAt"), undefined),
          q.lte(q.field("voucherValidFrom"), now),
          q.gte(q.field("voucherValidTo"), now)
        )
      )
      .collect();

    return await Promise.all(
      vouchers.map(async (voucher) => ({
        ...voucher,
        voucherUrl: voucher.voucherStorageId
          ? await ctx.storage.getUrl(voucher.voucherStorageId)
          : null,
      }))
    );
  },
});

export const getExpiringVouchersByBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const now = Date.now();
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;
    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("flaggedAt"), undefined),
          q.gte(q.field("voucherValidTo"), now),
          q.lte(q.field("voucherValidTo"), thirtyDaysFromNow)
        )
      )
      .collect();

    return await Promise.all(
      vouchers.map(async (voucher) => ({
        ...voucher,
        voucherUrl: voucher.voucherStorageId
          ? await ctx.storage.getUrl(voucher.voucherStorageId)
          : null,
      }))
    );
  },
});

export const getVoucherByIdWithBusiness = query({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, { voucherId }) => {
    const voucher = await ctx.db.get(voucherId);
    if (
      !voucher ||
      voucher.deletedAt !== undefined ||
      voucher.flaggedAt !== undefined
    )
      return null;

    const business = await ctx.db.get(voucher.businessId);
    if (
      !business ||
      business.deletedAt !== undefined ||
      business.flaggedAt !== undefined
    )
      return null;

    const [industry, voucherUrl, logoUrl] = await Promise.all([
      ctx.db.get(business.industryId),
      voucher.voucherStorageId
        ? ctx.storage.getUrl(voucher.voucherStorageId)
        : null,
      business.logoStorageId
        ? ctx.storage.getUrl(business.logoStorageId)
        : null,
    ]);

    return {
      ...voucher,
      voucherUrl,
      business: { ...business, logoUrl, industry },
    };
  },
});

export const createVoucher = mutation({
  args: {
    businessId: v.id("businesses"),
    title: v.string(),
    description: v.string(),
    voucherFormat: v.union(
      v.literal("barcode"),
      v.literal("qr_code"),
      v.literal("generated_text")
    ),
    voucherStorageId: v.optional(v.id("_storage")),
    voucherGenCode: v.optional(v.string()),
    voucherTerms: v.optional(v.string()),
    voucherValidFrom: v.number(),
    voucherValidTo: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const business = await ctx.db.get(args.businessId);
    if (!business) throw new Error("Business not found");
    if (business.userId !== userId) throw new Error("Unauthorized");

    const voucherId = await ctx.db.insert("vouchers", {
      ...args,
      userId,
    });
    return await ctx.db.get(voucherId);
  },
});

export const updateVoucher = mutation({
  args: {
    voucherId: v.id("vouchers"),
    title: v.string(),
    description: v.string(),
    voucherFormat: v.union(
      v.literal("barcode"),
      v.literal("qr_code"),
      v.literal("generated_text")
    ),
    voucherStorageId: v.optional(v.id("_storage")),
    voucherGenCode: v.optional(v.string()),
    voucherTerms: v.optional(v.string()),
    voucherValidFrom: v.number(),
    voucherValidTo: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const voucher = await ctx.db.get(args.voucherId);

    if (!voucher) throw new Error("Voucher not found");
    if (voucher.userId !== userId) throw new Error("Unauthorized");

    const { voucherId, ...updates } = args;

    if (
      voucher.voucherStorageId &&
      args.voucherStorageId &&
      voucher.voucherStorageId !== args.voucherStorageId
    ) {
      await ctx.storage.delete(voucher.voucherStorageId);
    }

    await ctx.db.patch(voucherId, updates);
    return await ctx.db.get(voucherId);
  },
});

export const deleteVoucher = mutation({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, { voucherId }) => {
    const userId = await requireAuth(ctx);
    const voucher = await ctx.db.get(voucherId);

    if (!voucher) throw new Error("Voucher not found");
    if (voucher.userId !== userId) throw new Error("Unauthorized");

    if (voucher.voucherStorageId) {
      await ctx.storage.delete(voucher.voucherStorageId);
    }

    await ctx.db.patch(voucherId, { deletedAt: Date.now() });
    return { success: true };
  },
});
