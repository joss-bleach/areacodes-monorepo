import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { Effect, Layer } from "effect";
import {
  PilotConfigRepo,
  PilotService,
  type IPilotConfigRepo,
} from "@areacodes/domain";

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  if ((identity as { role?: string }).role !== "admin")
    throw new Error("Forbidden: Admin only");
}

// Convex implementation of the domain IPilotConfigRepo. All Pilot Feature
// business logic lives in the domain PilotService; this repo only persists the
// single config document (creating it lazily on first write).
function makeConvexRepo(ctx: MutationCtx): IPilotConfigRepo {
  return {
    getActiveFeatures: () =>
      Effect.promise(async () => {
        const config = await ctx.db.query("config").first();
        return config?.activePilotFeatures ?? [];
      }),
    setActiveFeatures: (features) =>
      Effect.promise(async () => {
        const existing = await ctx.db.query("config").first();
        if (existing) {
          await ctx.db.patch(existing._id, { activePilotFeatures: features });
        } else {
          await ctx.db.insert("config", { activePilotFeatures: features });
        }
      }),
  };
}

function runPilotEffect(
  ctx: MutationCtx,
  effect: Effect.Effect<void, never, PilotConfigRepo>,
): Promise<void> {
  const layer = Layer.succeed(PilotConfigRepo, makeConvexRepo(ctx));
  return Effect.runPromise(Effect.provide(effect, layer));
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
    await runPilotEffect(ctx, PilotService.addFeature(key));
  },
});

export const removePilotFeature = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await requireAdmin(ctx);
    await runPilotEffect(ctx, PilotService.removeFeature(key));
  },
});
