import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../betterAuth/auth";

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");

  const user = await authComponent.getAuthUser(ctx);
  if (!user || (user as { role?: string }).role !== "admin") {
    throw new Error("Forbidden: Admin only");
  }
  return identity.subject;
}

export const getAllBusinesses = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const businesses = await ctx.db.query("businesses").collect();
    return await Promise.all(
      businesses.map(async (business) => {
        const industry = await ctx.db.get(business.industryId);
        const logoUrl = business.logoStorageId
          ? await ctx.storage.getUrl(business.logoStorageId)
          : null;
        return { ...business, logoUrl, industry };
      })
    );
  },
});

export const getAllVouchers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const vouchers = await ctx.db.query("vouchers").collect();
    return await Promise.all(
      vouchers.map(async (voucher) => {
        const business = await ctx.db.get(voucher.businessId);
        const voucherUrl = voucher.voucherStorageId
          ? await ctx.storage.getUrl(voucher.voucherStorageId)
          : null;
        return { ...voucher, voucherUrl, business };
      })
    );
  },
});

export const getAuditLog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("auditLog")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

export const flagBusiness = mutation({
  args: {
    businessId: v.id("businesses"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { businessId, notes }) => {
    const userId = await requireAdmin(ctx);
    const business = await ctx.db.get(businessId);
    if (!business) throw new Error("Business not found");

    const now = Date.now();
    await ctx.db.patch(businessId, { flaggedAt: now });

    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();
    for (const voucher of vouchers) {
      if (!voucher.deletedAt) {
        await ctx.db.patch(voucher._id, { flaggedAt: now });
      }
    }

    await ctx.db.insert("auditLog", {
      userId,
      action: "flag_business",
      targetType: "business",
      targetId: businessId,
      notes,
      createdAt: now,
    });

    return { success: true };
  },
});

export const reinstateBusiness = mutation({
  args: {
    businessId: v.id("businesses"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { businessId, notes }) => {
    const userId = await requireAdmin(ctx);
    const business = await ctx.db.get(businessId);
    if (!business) throw new Error("Business not found");

    await ctx.db.patch(businessId, { flaggedAt: undefined });

    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();
    for (const voucher of vouchers) {
      if (voucher.flaggedAt !== undefined) {
        await ctx.db.patch(voucher._id, { flaggedAt: undefined });
      }
    }

    const now = Date.now();
    await ctx.db.insert("auditLog", {
      userId,
      action: "reinstate_business",
      targetType: "business",
      targetId: businessId,
      notes,
      createdAt: now,
    });

    return { success: true };
  },
});

export const removeVoucher = mutation({
  args: {
    voucherId: v.id("vouchers"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { voucherId, notes }) => {
    const userId = await requireAdmin(ctx);
    const voucher = await ctx.db.get(voucherId);
    if (!voucher) throw new Error("Voucher not found");

    await ctx.db.patch(voucherId, { flaggedAt: Date.now() });

    await ctx.db.insert("auditLog", {
      userId,
      action: "remove_voucher",
      targetType: "voucher",
      targetId: voucherId,
      notes,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
