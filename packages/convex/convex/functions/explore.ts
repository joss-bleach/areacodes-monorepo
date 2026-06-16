import { query } from "../_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { Effect, Layer } from "effect";
import { SubscriptionRepo, SubscriptionService, type ISubscriptionRepo, type SubscriptionDoc } from "@areacodes/domain";
import { isHidden } from "./visibility";
import { isActiveVoucher } from "../lib/voucher-filters";

function makeConvexSubscriptionQueryRepo(ctx: QueryCtx): ISubscriptionRepo {
  return {
    findByBusiness: (businessId) =>
      Effect.promise(async () =>
        (await ctx.db
          .query("subscriptions")
          .withIndex("by_business", (q) =>
            q.eq("businessId", businessId as Id<"businesses">),
          )
          .first()) as unknown as SubscriptionDoc | null,
      ),
    findByStripeCustomer: () => Effect.die("not available in this context"),
    findByStripeSubscription: () => Effect.die("not available in this context"),
    insert: () => Effect.die("not available in this context"),
    patch: () => Effect.die("not available in this context"),
  };
}

async function isBusinessSuspended(
  ctx: QueryCtx,
  businessId: Id<"businesses">,
  now: number,
): Promise<boolean> {
  const layer = Layer.succeed(SubscriptionRepo, makeConvexSubscriptionQueryRepo(ctx));
  const result = await Effect.runPromise(
    Effect.either(
      Effect.provide(SubscriptionService.getGateStatus(businessId, now), layer),
    ),
  );
  if (result._tag === "Left") return false; // no subscription → not suspended
  return result.right === "suspended";
}

export const getBusinessesWithVouchers = query({
  args: {
    industryId: v.optional(v.id("industries")),
  },
  handler: async (ctx, { industryId }) => {
    const now = Date.now();

    const businesses = await ctx.db
      .query("businesses")
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("flaggedAt"), undefined)
        )
      )
      .collect();

    const filtered = industryId
      ? businesses.filter((b) => b.industryId === industryId)
      : businesses;

    const results = await Promise.all(
      filtered.map(async (business) => {
        if (await isBusinessSuspended(ctx, business._id, now)) return null;

        const vouchers = await ctx.db
          .query("vouchers")
          .withIndex("by_business", (q) =>
            q.eq("businessId", business._id)
          )
          .filter((q) => isActiveVoucher(q, now))
          .collect();

        if (vouchers.length === 0) return null;

        const [industry, logoUrl, vouchersWithUrls] = await Promise.all([
          ctx.db.get(business.industryId),
          business.logoStorageId
            ? ctx.storage.getUrl(business.logoStorageId)
            : null,
          Promise.all(
            vouchers.map(async (voucher) => ({
              ...voucher,
              voucherUrl: voucher.voucherStorageId
                ? await ctx.storage.getUrl(voucher.voucherStorageId)
                : null,
            }))
          ),
        ]);

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

export const getBusinessByIdWithVouchers = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const business = await ctx.db.get(businessId);
    if (!business || isHidden(business)) return null;

    const now = Date.now();
    if (await isBusinessSuspended(ctx, businessId, now)) return null;

    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) => isActiveVoucher(q, now))
      .collect();

    const [industry, logoUrl, vouchersWithUrls] = await Promise.all([
      ctx.db.get(business.industryId),
      business.logoStorageId
        ? ctx.storage.getUrl(business.logoStorageId)
        : null,
      Promise.all(
        vouchers.map(async (voucher) => ({
          ...voucher,
          voucherUrl: voucher.voucherStorageId
            ? await ctx.storage.getUrl(voucher.voucherStorageId)
            : null,
        }))
      ),
    ]);

    return {
      ...business,
      logoUrl,
      industry,
      vouchers: vouchersWithUrls,
    };
  },
});
