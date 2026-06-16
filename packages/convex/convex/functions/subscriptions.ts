import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { Effect, Layer } from "effect";
import {
  SubscriptionRepo,
  SubscriptionService,
  type ISubscriptionRepo,
  type SubscriptionDoc,
  type StripeWebhookEvent,
} from "@areacodes/domain";

// Convex stores status as string; domain uses the SubscriptionStatus union.
function toDoc(doc: unknown): SubscriptionDoc | null {
  return doc as SubscriptionDoc | null;
}

function makeConvexSubscriptionRepo(ctx: MutationCtx): ISubscriptionRepo {
  return {
    findByBusiness: (businessId) =>
      Effect.promise(async () =>
        toDoc(
          await ctx.db
            .query("subscriptions")
            .withIndex("by_business", (q) =>
              q.eq("businessId", businessId as Id<"businesses">),
            )
            .first(),
        ),
      ),
    findByStripeCustomer: (stripeCustomerId) =>
      Effect.promise(async () =>
        toDoc(
          await ctx.db
            .query("subscriptions")
            .withIndex("by_stripe_customer", (q) =>
              q.eq("stripeCustomerId", stripeCustomerId),
            )
            .first(),
        ),
      ),
    findByStripeSubscription: (stripeSubscriptionId) =>
      Effect.promise(async () =>
        toDoc(
          await ctx.db
            .query("subscriptions")
            .withIndex("by_stripe_subscription", (q) =>
              q.eq("stripeSubscriptionId", stripeSubscriptionId),
            )
            .first(),
        ),
      ),
    insert: (data) =>
      Effect.promise(async () => {
        const id = await ctx.db.insert("subscriptions", {
          businessId: data.businessId as Id<"businesses">,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          status: data.status,
          trialEnd: data.trialEnd,
          currentPeriodEnd: data.currentPeriodEnd,
          priceId: data.priceId,
          lastStripeEventId: data.lastStripeEventId,
        });
        return id as unknown as string;
      }),
    patch: (id, data) =>
      Effect.promise(async () => {
        const fields = Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined),
        );
        if (Object.keys(fields).length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await ctx.db.patch(id as Id<"subscriptions">, fields as any);
        }
      }),
  };
}

function makeConvexSubscriptionQueryRepo(ctx: QueryCtx): ISubscriptionRepo {
  return {
    findByBusiness: (businessId) =>
      Effect.promise(async () =>
        toDoc(
          await ctx.db
            .query("subscriptions")
            .withIndex("by_business", (q) =>
              q.eq("businessId", businessId as Id<"businesses">),
            )
            .first(),
        ),
      ),
    findByStripeCustomer: (stripeCustomerId) =>
      Effect.promise(async () =>
        toDoc(
          await ctx.db
            .query("subscriptions")
            .withIndex("by_stripe_customer", (q) =>
              q.eq("stripeCustomerId", stripeCustomerId),
            )
            .first(),
        ),
      ),
    findByStripeSubscription: (stripeSubscriptionId) =>
      Effect.promise(async () =>
        toDoc(
          await ctx.db
            .query("subscriptions")
            .withIndex("by_stripe_subscription", (q) =>
              q.eq("stripeSubscriptionId", stripeSubscriptionId),
            )
            .first(),
        ),
      ),
    insert: () => Effect.die("not available in query context"),
    patch: () => Effect.die("not available in query context"),
  };
}

const TRIAL_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

export const startPilot = mutation({
  args: {
    businessId: v.id("businesses"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, { businessId, stripeCustomerId }) => {
    const layer = Layer.succeed(
      SubscriptionRepo,
      makeConvexSubscriptionRepo(ctx),
    );

    const id = await Effect.runPromise(
      Effect.provide(
        SubscriptionService.startPilot(businessId, stripeCustomerId),
        layer,
      ),
    );

    await ctx.db.patch(id as Id<"subscriptions">, {
      trialEnd: Date.now() + TRIAL_PERIOD_MS,
    });

    return id as Id<"subscriptions">;
  },
});

export const getSubscription = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_business", (q) => q.eq("businessId", businessId))
      .first();
  },
});

export const getGateStatus = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, { businessId }) => {
    const now = Date.now();
    const layer = Layer.succeed(
      SubscriptionRepo,
      makeConvexSubscriptionQueryRepo(ctx),
    );

    const result = await Effect.runPromise(
      Effect.either(
        Effect.provide(SubscriptionService.getGateStatus(businessId, now), layer),
      ),
    );

    if (result._tag === "Left") return null;
    return result.right;
  },
});

export const handleWebhookEvent = internalMutation({
  args: { event: v.any() },
  handler: async (ctx, { event }) => {
    const layer = Layer.succeed(
      SubscriptionRepo,
      makeConvexSubscriptionRepo(ctx),
    );

    await Effect.runPromise(
      Effect.provide(
        SubscriptionService.handleStripeWebhookEvent(event as StripeWebhookEvent),
        layer,
      ),
    );
  },
});
