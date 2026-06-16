import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { Effect, Layer } from "effect";
import { VoucherRepo, VoucherService, SubscriptionRepo, SubscriptionService, type IVoucherRepo, type ISubscriptionRepo, type SubscriptionDoc } from "@areacodes/domain";
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
          voucherFormat: data.voucherFormat,
          voucherStorageId: data.voucherStorageId as Id<"_storage"> | undefined,
          voucherGenCode: data.voucherGenCode,
          voucherTerms: data.voucherTerms,
          voucherValidFrom: data.voucherValidFrom,
          voucherValidTo: data.voucherValidTo,
        });
        return id as unknown as string;
      }),
    patch: (id, data) =>
      Effect.promise(async () => {
        await ctx.db.patch(id as Id<"vouchers">, {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.voucherFormat !== undefined ? { voucherFormat: data.voucherFormat } : {}),
          ...(Object.prototype.hasOwnProperty.call(data, "voucherStorageId")
            ? { voucherStorageId: data.voucherStorageId as Id<"_storage"> | undefined }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(data, "voucherGenCode")
            ? { voucherGenCode: data.voucherGenCode }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(data, "voucherTerms")
            ? { voucherTerms: data.voucherTerms }
            : {}),
          ...(data.voucherValidFrom !== undefined ? { voucherValidFrom: data.voucherValidFrom } : {}),
          ...(data.voucherValidTo !== undefined ? { voucherValidTo: data.voucherValidTo } : {}),
          ...(data.deletedAt !== undefined ? { deletedAt: data.deletedAt } : {}),
        });
      }),
    deleteStorage: (storageId) =>
      Effect.promise(async () => {
        await ctx.storage.delete(storageId as Id<"_storage">);
      }),
  };
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
    if (await isBusinessSuspended(ctx, businessId, now)) return [];

    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .filter((q) => isActiveVoucher(q, now))
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
    if (!voucher || isHidden(voucher)) return null;

    const business = await ctx.db.get(voucher.businessId);
    if (!business || isHidden(business)) return null;

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
    const repo = makeConvexRepo(ctx);
    const layer = Layer.succeed(VoucherRepo, repo);

    const { businessId, ...voucherArgs } = args;
    const voucherId = await Effect.runPromise(
      Effect.provide(VoucherService.create(userId, businessId, voucherArgs), layer),
    );

    return await ctx.db.get(voucherId as unknown as Id<"vouchers">);
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
