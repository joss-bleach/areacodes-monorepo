import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { Effect, Layer } from "effect";
import {
  BusinessRepo,
  BusinessService,
  type IBusinessRepo,
} from "@areacodes/domain";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

function makeConvexRepo(ctx: MutationCtx): IBusinessRepo {
  return {
    findBySlug: (slug) =>
      Effect.promise(() =>
        ctx.db
          .query("businesses")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first(),
      ),
    findById: (id) =>
      Effect.promise(() => ctx.db.get(id as Id<"businesses">)),
    insert: (data) =>
      Effect.promise(async () => {
        const id = await ctx.db.insert("businesses", {
          userId: data.userId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          websiteUrl: data.websiteUrl,
          industryId: data.industryId as Id<"industries">,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          logoStorageId: data.logoStorageId as Id<"_storage"> | undefined,
        });
        return id as unknown as string;
      }),
    patch: (id, data) =>
      Effect.promise(async () => {
        await ctx.db.patch(id as Id<"businesses">, {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.websiteUrl !== undefined ? { websiteUrl: data.websiteUrl } : {}),
          ...(data.industryId !== undefined
            ? { industryId: data.industryId as Id<"industries"> }
            : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
          ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
          ...(Object.prototype.hasOwnProperty.call(data, "logoStorageId")
            ? { logoStorageId: data.logoStorageId as Id<"_storage"> | undefined }
            : {}),
          ...(data.deletedAt !== undefined ? { deletedAt: data.deletedAt } : {}),
        });
      }),
    findVouchersByBusiness: (businessId) =>
      Effect.promise(() =>
        ctx.db
          .query("vouchers")
          .withIndex("by_business", (q) =>
            q.eq("businessId", businessId as Id<"businesses">),
          )
          .collect(),
      ),
    patchVoucher: (id, data) =>
      Effect.promise(async () => {
        await ctx.db.patch(id as Id<"vouchers">, { deletedAt: data.deletedAt });
      }),
    deleteStorage: (storageId) =>
      Effect.promise(async () => {
        await ctx.storage.delete(storageId as Id<"_storage">);
      }),
  };
}

export const getBusinessByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (!business) return null;

    const logoUrl = business.logoStorageId
      ? await ctx.storage.getUrl(business.logoStorageId)
      : null;

    return { ...business, logoUrl };
  },
});

export const getBusinessBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.eq(q.field("flaggedAt"), undefined)
        )
      )
      .first();

    if (!business) return null;

    const logoUrl = business.logoStorageId
      ? await ctx.storage.getUrl(business.logoStorageId)
      : null;

    return { ...business, logoUrl };
  },
});

export const createBusiness = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    websiteUrl: v.string(),
    industryId: v.id("industries"),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const repo = makeConvexRepo(ctx);
    const layer = Layer.succeed(BusinessRepo, repo);

    const id = await Effect.runPromise(
      Effect.provide(BusinessService.create(userId, args), layer),
    );

    return await ctx.db.get(id as unknown as Id<"businesses">);
  },
});

export const updateBusiness = mutation({
  args: {
    businessId: v.id("businesses"),
    name: v.string(),
    description: v.string(),
    websiteUrl: v.string(),
    industryId: v.id("industries"),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const repo = makeConvexRepo(ctx);
    const layer = Layer.succeed(BusinessRepo, repo);

    await Effect.runPromise(
      Effect.provide(
        BusinessService.update(userId, args.businessId, args),
        layer,
      ),
    );

    return await ctx.db.get(args.businessId);
  },
});

export const deleteBusiness = mutation({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const userId = await requireAuth(ctx);
    const repo = makeConvexRepo(ctx);
    const layer = Layer.succeed(BusinessRepo, repo);

    return await Effect.runPromise(
      Effect.provide(BusinessService.softDelete(userId, businessId), layer),
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
