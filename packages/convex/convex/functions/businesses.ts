import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    const baseSlug = slugify(args.name);

    const existing = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", baseSlug))
      .first();

    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

    const businessId = await ctx.db.insert("businesses", {
      userId,
      name: args.name,
      slug,
      description: args.description,
      websiteUrl: args.websiteUrl,
      logoStorageId: args.logoStorageId,
      industryId: args.industryId,
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
    });

    return await ctx.db.get(businessId);
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
    const business = await ctx.db.get(args.businessId);

    if (!business) throw new Error("Business not found");
    if (business.userId !== userId) throw new Error("Unauthorized");

    let newSlug = business.slug;
    if (business.name !== args.name) {
      const baseSlug = slugify(args.name);
      const existing = await ctx.db
        .query("businesses")
        .withIndex("by_slug", (q) => q.eq("slug", baseSlug))
        .first();
      newSlug =
        existing && existing._id !== args.businessId
          ? `${baseSlug}-${Date.now()}`
          : baseSlug;
    }

    if (
      business.logoStorageId &&
      args.logoStorageId &&
      business.logoStorageId !== args.logoStorageId
    ) {
      await ctx.storage.delete(business.logoStorageId);
    }

    await ctx.db.patch(args.businessId, {
      name: args.name,
      slug: newSlug,
      description: args.description,
      websiteUrl: args.websiteUrl,
      industryId: args.industryId,
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
      logoStorageId: args.logoStorageId,
    });

    return await ctx.db.get(args.businessId);
  },
});

export const deleteBusiness = mutation({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const userId = await requireAuth(ctx);
    const business = await ctx.db.get(businessId);

    if (!business) throw new Error("Business not found");
    if (business.userId !== userId) throw new Error("Unauthorized");

    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();

    for (const voucher of vouchers) {
      if (voucher.voucherStorageId) {
        await ctx.storage.delete(voucher.voucherStorageId);
      }
      await ctx.db.patch(voucher._id, { deletedAt: Date.now() });
    }

    if (business.logoStorageId) {
      await ctx.storage.delete(business.logoStorageId);
    }

    await ctx.db.patch(businessId, { deletedAt: Date.now() });
    return { success: true };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
