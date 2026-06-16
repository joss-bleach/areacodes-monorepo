import { Context, Data, Effect } from "effect";

// ── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type GateStatus = "active" | "trialing" | "suspended";

export interface SubscriptionDoc {
  _id: string;
  businessId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  status: SubscriptionStatus;
  trialEnd?: number;
  currentPeriodEnd?: number;
  priceId?: string;
  lastStripeEventId?: string;
}

// ── Stripe event types ────────────────────────────────────────────────────────

interface StripeCheckoutSessionCompleted {
  id: string;
  type: "checkout.session.completed";
  data: { object: { customer: string; subscription: string } };
}

interface StripeSubscriptionUpdated {
  id: string;
  type: "customer.subscription.updated";
  data: {
    object: {
      id: string;
      customer: string;
      status: string;
      current_period_end: number;
      trial_end: number | null;
      items: { data: Array<{ price: { id: string } }> };
    };
  };
}

interface StripeSubscriptionDeleted {
  id: string;
  type: "customer.subscription.deleted";
  data: { object: { id: string; customer: string } };
}

interface StripeInvoicePaymentFailed {
  id: string;
  type: "invoice.payment_failed";
  data: { object: { subscription: string; customer: string } };
}

export type StripeWebhookEvent =
  | StripeCheckoutSessionCompleted
  | StripeSubscriptionUpdated
  | StripeSubscriptionDeleted
  | StripeInvoicePaymentFailed;

// ── Typed errors ──────────────────────────────────────────────────────────────

export class BusinessNotFound extends Data.TaggedError("BusinessNotFound")<{
  id: string;
}> {}

// ── Repository interface ──────────────────────────────────────────────────────

export interface ISubscriptionRepo {
  readonly findByBusiness: (businessId: string) => Effect.Effect<SubscriptionDoc | null>;
  readonly findByStripeCustomer: (
    stripeCustomerId: string,
  ) => Effect.Effect<SubscriptionDoc | null>;
  readonly findByStripeSubscription: (
    stripeSubscriptionId: string,
  ) => Effect.Effect<SubscriptionDoc | null>;
  readonly insert: (data: Omit<SubscriptionDoc, "_id">) => Effect.Effect<string>;
  readonly patch: (
    id: string,
    data: Partial<Omit<SubscriptionDoc, "_id">>,
  ) => Effect.Effect<void>;
}

export class SubscriptionRepo extends Context.Tag(
  "@areacodes/domain/SubscriptionRepo",
)<SubscriptionRepo, ISubscriptionRepo>() {}

// ── Service functions ─────────────────────────────────────────────────────────

export const startPilot = (
  businessId: string,
  stripeCustomerId: string,
): Effect.Effect<string, never, SubscriptionRepo> =>
  Effect.gen(function* () {
    const repo = yield* SubscriptionRepo;
    return yield* repo.insert({
      businessId,
      stripeCustomerId,
      status: "trialing",
    });
  });

export const handleStripeWebhookEvent = (
  event: StripeWebhookEvent,
): Effect.Effect<void, never, SubscriptionRepo> =>
  Effect.gen(function* () {
    const repo = yield* SubscriptionRepo;

    if (event.type === "checkout.session.completed") {
      const sub = yield* repo.findByStripeCustomer(event.data.object.customer);
      if (!sub) return;
      if (sub.lastStripeEventId === event.id) return;
      yield* repo.patch(sub._id, {
        stripeSubscriptionId: event.data.object.subscription,
        lastStripeEventId: event.id,
      });
    } else if (event.type === "customer.subscription.updated") {
      const obj = event.data.object;

      let sub = yield* repo.findByStripeSubscription(obj.id);
      if (!sub) {
        sub = yield* repo.findByStripeCustomer(obj.customer);
      }
      if (!sub) return;
      if (sub.lastStripeEventId === event.id) return;

      yield* repo.patch(sub._id, {
        stripeSubscriptionId: obj.id,
        status: obj.status as SubscriptionStatus,
        currentPeriodEnd: obj.current_period_end * 1000,
        trialEnd: obj.trial_end !== null ? obj.trial_end * 1000 : undefined,
        priceId: obj.items.data[0]?.price.id,
        lastStripeEventId: event.id,
      });
    } else if (event.type === "customer.subscription.deleted") {
      const sub = yield* repo.findByStripeSubscription(event.data.object.id);
      if (!sub) return;
      if (sub.lastStripeEventId === event.id) return;
      yield* repo.patch(sub._id, {
        status: "canceled",
        lastStripeEventId: event.id,
      });
    } else if (event.type === "invoice.payment_failed") {
      const sub = yield* repo.findByStripeSubscription(event.data.object.subscription);
      if (!sub) return;
      if (sub.lastStripeEventId === event.id) return;
      yield* repo.patch(sub._id, {
        status: "past_due",
        lastStripeEventId: event.id,
      });
    }
  });

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const getGateStatus = (
  businessId: string,
  now: number,
): Effect.Effect<GateStatus, BusinessNotFound, SubscriptionRepo> =>
  Effect.gen(function* () {
    const repo = yield* SubscriptionRepo;
    const sub = yield* repo.findByBusiness(businessId);
    if (!sub) return yield* Effect.fail(new BusinessNotFound({ id: businessId }));

    if (sub.status === "trialing") return "trialing";
    if (sub.status === "active") return "active";
    if (sub.status === "past_due") {
      if (sub.currentPeriodEnd && sub.currentPeriodEnd + SEVEN_DAYS_MS > now) {
        return "active";
      }
      return "suspended";
    }
    return "suspended";
  });
