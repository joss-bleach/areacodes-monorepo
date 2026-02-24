import { query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

export const getBusinessesWithVouchers = query({
  args: {
    industryId: v.optional(v.id("industries")),
  },
  handler: async (ctx, { industryId }) => {
    const now = Date.now();

    const businesses = await ctx.db
      .query("businesses")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const filtered = industryId
      ? businesses.filter((b) => b.industryId === industryId)
      : businesses;

    const results = await Promise.all(
      filtered.map(async (business) => {
        const vouchers = await ctx.db
          .query("vouchers")
          .withIndex("by_business", (q) =>
            q.eq("businessId", business._id)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("deletedAt"), undefined),
              q.lte(q.field("voucherValidFrom"), now),
              q.gte(q.field("voucherValidTo"), now)
            )
          )
          .collect();

        if (vouchers.length === 0) return null;

        const industry = await ctx.db.get(business.industryId);

        const logoUrl = business.logoStorageId
          ? await ctx.storage.getUrl(business.logoStorageId)
          : null;

        const vouchersWithUrls = await Promise.all(
          vouchers.map(async (voucher) => ({
            ...voucher,
            voucherUrl: voucher.voucherStorageId
              ? await ctx.storage.getUrl(voucher.voucherStorageId)
              : null,
          }))
        );

        return {
          ...business,
          logoUrl,
          industry,
          vouchers: vouchersWithUrls,
        };
      })
    );

    return results.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );
  },
});
