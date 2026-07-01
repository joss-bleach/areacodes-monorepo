import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { Effect, Layer } from "effect";
import { VoucherRepo, VoucherService, type IVoucherRepo } from "@areacodes/domain";
import { isHidden } from "./visibility";
import { isActiveVoucher, isCustomerVisible } from "../lib/voucher_filters";
import { isBusinessSuspended } from "../lib/subscription_gate";
import { internal } from "../_generated/api";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

function makeConvexRepo(ctx: MutationCtx): IVoucherRepo {
  return {
    findBusiness: (id) =>
      Effect.promise(() => ctx.db.get(id as Id<"businesses">)),
    findById: (id) =>
      Effect.promise(() => ctx.db.get(id as Id<"vouchers">)),
    insert: (data) =>
      Effect.promise(async () => {
        const id = await ctx.db.insert("vouchers", {
          businessId: data.businessId as Id<"businesses">,
          userId: data.userId,
          title: data.title,
          description: data.description,
          provider: data.provider,
          discount: data.discount,
          provisioning: data.provisioning,
          voucherTerms: data.voucherTerms,
          voucherValidFrom: data.voucherValidFrom,
          voucherValidTo: data.voucherValidTo,
        });
        return id as unknown as string;
      }),
    patch: (id, data) =>
      Effect.promise(async () => {
        const patch: Record<string, unknown> = {};
        if (data.title !== undefined) patch.title = data.title;
        if (data.description !== undefined) patch.description = data.description;
        if (data.discount !== undefined) patch.discount = data.discount;
        if (Object.prototype.hasOwnProperty.call(data, "voucherTerms"))
          patch.voucherTerms = data.voucherTerms;
        if (data.voucherValidFrom !== undefined) patch.voucherValidFrom = data.voucherValidFrom;
        if (data.voucherValidTo !== undefined) patch.voucherValidTo = data.voucherValidTo;
        if (data.deletedAt !== undefined) patch.deletedAt = data.deletedAt;
        if (data.provisioning !== undefined) patch.provisioning = data.provisioning;
        await ctx.db.patch(id as Id<"vouchers">, patch);
      }),
  };
}

const discountValidator = v.object({
  kind: v.union(
    v.literal("percentage"),
    v.literal("fixed_amount"),
    v.literal("free_item"),
    v.literal("bogof"),
    v.literal("custom"),
  ),
  value: v.optional(v.number()),
  currency: v.optional(v.string()),
  itemName: v.optional(v.string()),
  customText: v.optional(v.string()),
});

export const getVouchersByBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    await requireAuth(ctx);
    return ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("flaggedAt"), undefined)
        )
      )
      .collect();
  },
});

export const getActiveVouchersByBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const now = Date.now();
    if (await isBusinessSuspended(ctx, businessId, now)) return [];

    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) => isActiveVoucher(q, now))
      .collect();

    return vouchers.filter((v) => isCustomerVisible(v, now));
  },
});

export const getExpiringVouchersByBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const now = Date.now();
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;
    return ctx.db
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
  },
});

export const getVoucherByIdWithBusiness = query({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, { voucherId }) => {
    const voucher = await ctx.db.get(voucherId);
    if (!voucher || isHidden(voucher)) return null;

    const business = await ctx.db.get(voucher.businessId);
    if (!business || isHidden(business)) return null;

    const [industry, logoUrl] = await Promise.all([
      ctx.db.get(business.industryId),
      business.logoStorageId
        ? ctx.storage.getUrl(business.logoStorageId)
        : null,
    ]);

    return {
      ...voucher,
      business: { ...business, logoUrl, industry },
    };
  },
});

export const createVoucher = mutation({
  args: {
    businessId: v.id("businesses"),
    title: v.string(),
    description: v.string(),
    provider: v.union(v.literal("square"), v.literal("manual")),
    discount: discountValidator,
    voucherTerms: v.optional(v.string()),
    voucherValidFrom: v.number(),
    voucherValidTo: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const repo = makeConvexRepo(ctx);
    const layer = Layer.succeed(VoucherRepo, repo);

    const { businessId, ...voucherArgs } = args;
    const voucherId = await Effect.runPromise(
      Effect.provide(VoucherService.create(userId, businessId, voucherArgs), layer),
    );

    const voucher = await ctx.db.get(voucherId as unknown as Id<"vouchers">);
    const business = voucher ? await ctx.db.get(voucher.businessId) : null;

    if (voucher && business) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.pushTokens.sendVoucherPushNotifications,
        {
          businessId: voucher.businessId,
          voucherId: voucher._id,
          businessName: business.name,
          voucherTitle: voucher.title,
        },
      );

      if (voucher.provider === "square") {
        await ctx.scheduler.runAfter(
          0,
          internal.functions.squareProvisioner.provisionVoucher,
          { voucherId: voucher._id },
        );
      }
    }

    return voucher;
  },
});

export const updateVoucher = mutation({
  args: {
    voucherId: v.id("vouchers"),
    title: v.string(),
    description: v.string(),
    discount: discountValidator,
    voucherTerms: v.optional(v.string()),
    voucherValidFrom: v.number(),
    voucherValidTo: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const repo = makeConvexRepo(ctx);
    const layer = Layer.succeed(VoucherRepo, repo);

    const { voucherId, ...voucherArgs } = args;
    await Effect.runPromise(
      Effect.provide(VoucherService.update(userId, voucherId, voucherArgs), layer),
    );

    return await ctx.db.get(voucherId);
  },
});

export const deleteVoucher = mutation({
  args: { voucherId: v.id("vouchers") },
  handler: async (ctx, { voucherId }) => {
    const userId = await requireAuth(ctx);
    const repo = makeConvexRepo(ctx);
    const layer = Layer.succeed(VoucherRepo, repo);

    return await Effect.runPromise(
      Effect.provide(VoucherService.softDelete(userId, voucherId), layer),
    );
  },
});
