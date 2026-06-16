import { Effect, Layer } from "effect";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  SubscriptionRepo,
  SubscriptionService,
  type ISubscriptionRepo,
  type SubscriptionDoc,
} from "@areacodes/domain";

// Convex stores status as a string; the domain layer uses the SubscriptionStatus union.
function toDoc(doc: unknown): SubscriptionDoc | null {
  return doc as SubscriptionDoc | null;
}

// Read-only subscription repo for the voucher suspension gate. Only findByBusiness
// is needed here; the other lookups and all writes `die` so misuse fails loudly.
export function makeConvexSubscriptionQueryRepo(
  ctx: QueryCtx | MutationCtx,
): ISubscriptionRepo {
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
    findByStripeCustomer: () => Effect.die("not available in this context"),
    findByStripeSubscription: () => Effect.die("not available in this context"),
    insert: () => Effect.die("not available in this context"),
    patch: () => Effect.die("not available in this context"),
  };
}

// A business is suspended when its subscription gate resolves to "suspended".
// A missing subscription (BusinessNotFound) means the business is not billed
// (pilot / no subscription) and is therefore not suspended.
export async function isBusinessSuspended(
  ctx: QueryCtx | MutationCtx,
  businessId: Id<"businesses">,
  now: number,
): Promise<boolean> {
  const layer = Layer.succeed(SubscriptionRepo, makeConvexSubscriptionQueryRepo(ctx));
  const result = await Effect.runPromise(
    Effect.either(
      Effect.provide(SubscriptionService.getGateStatus(businessId, now), layer),
    ),
  );
  return result._tag === "Right" && result.right === "suspended";
}
