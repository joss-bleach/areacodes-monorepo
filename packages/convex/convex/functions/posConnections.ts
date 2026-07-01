import { query } from "../_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "../_generated/server";

async function requireAuth(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

export const getPosConnections = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("posConnections")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .collect();
  },
});
