import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

export const followBusiness = mutation({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const customerId = await requireAuth(ctx);

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_customer_business", (q) =>
        q.eq("customerId", customerId).eq("businessId", businessId),
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("follows", {
      customerId,
      businessId,
      followedAt: Date.now(),
    });
  },
});

export const unfollowBusiness = mutation({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const customerId = await requireAuth(ctx);

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_customer_business", (q) =>
        q.eq("customerId", customerId).eq("businessId", businessId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getFollowForBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("follows")
      .withIndex("by_customer_business", (q) =>
        q
          .eq("customerId", identity.subject)
          .eq("businessId", businessId),
      )
      .first();
  },
});

export const getFollowersByBusiness = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    return await ctx.db
      .query("follows")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();
  },
});
