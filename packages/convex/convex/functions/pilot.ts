import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  if ((identity as { role?: string }).role !== "admin")
    throw new Error("Forbidden: Admin only");
}

async function getOrCreateConfig(ctx: MutationCtx) {
  const existing = await ctx.db.query("config").first();
  if (existing) return existing;
  const id = await ctx.db.insert("config", { activePilotFeatures: [] });
  return ctx.db.get(id);
}

export const getActivePilotFeatures = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("config").first();
    return config?.activePilotFeatures ?? [];
  },
});

export const addPilotFeature = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await requireAdmin(ctx);
    const config = await getOrCreateConfig(ctx);
    if (!config) return;
    if (!config.activePilotFeatures.includes(key)) {
      await ctx.db.patch(config._id, {
        activePilotFeatures: [...config.activePilotFeatures, key],
      });
    }
  },
});

export const removePilotFeature = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await requireAdmin(ctx);
    const config = await getOrCreateConfig(ctx);
    if (!config) return;
    await ctx.db.patch(config._id, {
      activePilotFeatures: config.activePilotFeatures.filter((k) => k !== key),
    });
  },
});
