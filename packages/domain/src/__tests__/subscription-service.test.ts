import { Effect, Either, Layer } from "effect";
import { describe, expect, test } from "vitest";
import {
  SubscriptionRepo,
  BusinessNotFound,
  type ISubscriptionRepo,
  type SubscriptionDoc,
  type StripeWebhookEvent,
} from "../subscription-service.js";
import * as SubscriptionService from "../subscription-service.js";

function makeTestRepo(options?: { subscriptions?: SubscriptionDoc[] }) {
  const subscriptions = [...(options?.subscriptions ?? [])];
  let nextId = 1;

  const repo: ISubscriptionRepo = {
    findByBusiness: (businessId) =>
      Effect.succeed(subscriptions.find((s) => s.businessId === businessId) ?? null),
    findByStripeCustomer: (stripeCustomerId) =>
      Effect.succeed(
        subscriptions.find((s) => s.stripeCustomerId === stripeCustomerId) ?? null,
      ),
    findByStripeSubscription: (stripeSubscriptionId) =>
      Effect.succeed(
        subscriptions.find((s) => s.stripeSubscriptionId === stripeSubscriptionId) ?? null,
      ),
    insert: (data) => {
      const id = `sub-${nextId++}`;
      subscriptions.push({ ...data, _id: id });
      return Effect.succeed(id);
    },
    patch: (id, data) => {
      const idx = subscriptions.findIndex((s) => s._id === id);
      if (idx !== -1) {
        subscriptions[idx] = { ...subscriptions[idx]!, ...data };
      }
      return Effect.void;
    },
  };

  const layer = Layer.succeed(SubscriptionRepo, repo);
  return { layer, subscriptions };
}

// ── startPilot ────────────────────────────────────────────────────────────────

describe("startPilot", () => {
  test("creates subscription record with status trialing", async () => {
    const { layer, subscriptions } = makeTestRepo();

    const id = await Effect.runPromise(
      Effect.provide(
        SubscriptionService.startPilot("biz-1", "cus_abc123"),
        layer,
      ),
    );

    expect(id).toBeDefined();
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]!.businessId).toBe("biz-1");
    expect(subscriptions[0]!.stripeCustomerId).toBe("cus_abc123");
    expect(subscriptions[0]!.status).toBe("trialing");
  });
});

// ── handleStripeWebhookEvent ──────────────────────────────────────────────────

describe("handleStripeWebhookEvent", () => {
  test("checkout.session.completed updates existing subscription with subscriptionId", async () => {
    const existing: SubscriptionDoc = {
      _id: "sub-1",
      businessId: "biz-1",
      stripeCustomerId: "cus_abc",
      status: "trialing",
    };
    const { layer, subscriptions } = makeTestRepo({ subscriptions: [existing] });

    const event: StripeWebhookEvent = {
      id: "evt_001",
      type: "checkout.session.completed",
      data: { object: { customer: "cus_abc", subscription: "sub_xyz" } },
    };

    await Effect.runPromise(
      Effect.provide(SubscriptionService.handleStripeWebhookEvent(event), layer),
    );

    expect(subscriptions[0]!.stripeSubscriptionId).toBe("sub_xyz");
    expect(subscriptions[0]!.lastStripeEventId).toBe("evt_001");
  });

  test("customer.subscription.updated updates status and priceId", async () => {
    const existing: SubscriptionDoc = {
      _id: "sub-1",
      businessId: "biz-1",
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_xyz",
      status: "trialing",
    };
    const { layer, subscriptions } = makeTestRepo({ subscriptions: [existing] });

    const event: StripeWebhookEvent = {
      id: "evt_002",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_xyz",
          customer: "cus_abc",
          status: "active",
          current_period_end: 1_750_000_000,
          trial_end: null,
          items: { data: [{ price: { id: "price_monthly" } }] },
        },
      },
    };

    await Effect.runPromise(
      Effect.provide(SubscriptionService.handleStripeWebhookEvent(event), layer),
    );

    expect(subscriptions[0]!.status).toBe("active");
    expect(subscriptions[0]!.priceId).toBe("price_monthly");
    expect(subscriptions[0]!.currentPeriodEnd).toBe(1_750_000_000 * 1000);
    expect(subscriptions[0]!.lastStripeEventId).toBe("evt_002");
  });

  test("customer.subscription.updated idempotency: same event ID twice produces identical state", async () => {
    const existing: SubscriptionDoc = {
      _id: "sub-1",
      businessId: "biz-1",
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_xyz",
      status: "trialing",
    };
    const { layer, subscriptions } = makeTestRepo({ subscriptions: [existing] });

    const event: StripeWebhookEvent = {
      id: "evt_dup",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_xyz",
          customer: "cus_abc",
          status: "active",
          current_period_end: 1_750_000_000,
          trial_end: null,
          items: { data: [{ price: { id: "price_monthly" } }] },
        },
      },
    };

    await Effect.runPromise(
      Effect.provide(SubscriptionService.handleStripeWebhookEvent(event), layer),
    );
    const stateAfterFirst = { ...subscriptions[0]! };

    await Effect.runPromise(
      Effect.provide(SubscriptionService.handleStripeWebhookEvent(event), layer),
    );

    expect(subscriptions[0]).toEqual(stateAfterFirst);
    expect(subscriptions).toHaveLength(1);
  });

  test("customer.subscription.deleted sets status to canceled", async () => {
    const existing: SubscriptionDoc = {
      _id: "sub-1",
      businessId: "biz-1",
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_xyz",
      status: "active",
    };
    const { layer, subscriptions } = makeTestRepo({ subscriptions: [existing] });

    const event: StripeWebhookEvent = {
      id: "evt_003",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_xyz", customer: "cus_abc" } },
    };

    await Effect.runPromise(
      Effect.provide(SubscriptionService.handleStripeWebhookEvent(event), layer),
    );

    expect(subscriptions[0]!.status).toBe("canceled");
    expect(subscriptions[0]!.lastStripeEventId).toBe("evt_003");
  });

  test("invoice.payment_failed sets status to past_due", async () => {
    const existing: SubscriptionDoc = {
      _id: "sub-1",
      businessId: "biz-1",
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_xyz",
      status: "active",
      currentPeriodEnd: 9_999_999_999_000,
    };
    const { layer, subscriptions } = makeTestRepo({ subscriptions: [existing] });

    const event: StripeWebhookEvent = {
      id: "evt_004",
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_xyz", customer: "cus_abc" } },
    };

    await Effect.runPromise(
      Effect.provide(SubscriptionService.handleStripeWebhookEvent(event), layer),
    );

    expect(subscriptions[0]!.status).toBe("past_due");
    expect(subscriptions[0]!.lastStripeEventId).toBe("evt_004");
  });

  test("priceId is correctly updated on customer.subscription.updated", async () => {
    const existing: SubscriptionDoc = {
      _id: "sub-1",
      businessId: "biz-1",
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_xyz",
      status: "active",
      priceId: "price_old",
    };
    const { layer, subscriptions } = makeTestRepo({ subscriptions: [existing] });

    const event: StripeWebhookEvent = {
      id: "evt_005",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_xyz",
          customer: "cus_abc",
          status: "active",
          current_period_end: 1_800_000_000,
          trial_end: null,
          items: { data: [{ price: { id: "price_annual" } }] },
        },
      },
    };

    await Effect.runPromise(
      Effect.provide(SubscriptionService.handleStripeWebhookEvent(event), layer),
    );

    expect(subscriptions[0]!.priceId).toBe("price_annual");
  });

  test("checkout.session.completed idempotency: same event ID twice is no-op", async () => {
    const existing: SubscriptionDoc = {
      _id: "sub-1",
      businessId: "biz-1",
      stripeCustomerId: "cus_abc",
      status: "trialing",
    };
    const { layer, subscriptions } = makeTestRepo({ subscriptions: [existing] });

    const event: StripeWebhookEvent = {
      id: "evt_idm",
      type: "checkout.session.completed",
      data: { object: { customer: "cus_abc", subscription: "sub_xyz" } },
    };

    await Effect.runPromise(
      Effect.provide(SubscriptionService.handleStripeWebhookEvent(event), layer),
    );
    const stateAfterFirst = { ...subscriptions[0]! };

    await Effect.runPromise(
      Effect.provide(SubscriptionService.handleStripeWebhookEvent(event), layer),
    );

    expect(subscriptions[0]).toEqual(stateAfterFirst);
  });
});

// ── getGateStatus ─────────────────────────────────────────────────────────────

describe("getGateStatus", () => {
  const NOW = 1_700_000_000_000; // arbitrary ms timestamp

  test("trialing subscription returns trialing", async () => {
    const { layer } = makeTestRepo({
      subscriptions: [
        {
          _id: "sub-1",
          businessId: "biz-1",
          stripeCustomerId: "cus_abc",
          status: "trialing",
        },
      ],
    });

    const status = await Effect.runPromise(
      Effect.provide(SubscriptionService.getGateStatus("biz-1", NOW), layer),
    );

    expect(status).toBe("trialing");
  });

  test("active subscription returns active", async () => {
    const { layer } = makeTestRepo({
      subscriptions: [
        {
          _id: "sub-1",
          businessId: "biz-1",
          stripeCustomerId: "cus_abc",
          stripeSubscriptionId: "sub_xyz",
          status: "active",
          currentPeriodEnd: NOW + 30 * 24 * 60 * 60 * 1000,
        },
      ],
    });

    const status = await Effect.runPromise(
      Effect.provide(SubscriptionService.getGateStatus("biz-1", NOW), layer),
    );

    expect(status).toBe("active");
  });

  test("past_due within 7-day grace period returns active", async () => {
    const periodEnd = NOW - 3 * 24 * 60 * 60 * 1000; // 3 days ago
    const { layer } = makeTestRepo({
      subscriptions: [
        {
          _id: "sub-1",
          businessId: "biz-1",
          stripeCustomerId: "cus_abc",
          stripeSubscriptionId: "sub_xyz",
          status: "past_due",
          currentPeriodEnd: periodEnd,
        },
      ],
    });

    const status = await Effect.runPromise(
      Effect.provide(SubscriptionService.getGateStatus("biz-1", NOW), layer),
    );

    expect(status).toBe("active");
  });

  test("past_due beyond 7-day grace period returns suspended", async () => {
    const periodEnd = NOW - 8 * 24 * 60 * 60 * 1000; // 8 days ago
    const { layer } = makeTestRepo({
      subscriptions: [
        {
          _id: "sub-1",
          businessId: "biz-1",
          stripeCustomerId: "cus_abc",
          stripeSubscriptionId: "sub_xyz",
          status: "past_due",
          currentPeriodEnd: periodEnd,
        },
      ],
    });

    const status = await Effect.runPromise(
      Effect.provide(SubscriptionService.getGateStatus("biz-1", NOW), layer),
    );

    expect(status).toBe("suspended");
  });

  test("canceled subscription returns suspended", async () => {
    const { layer } = makeTestRepo({
      subscriptions: [
        {
          _id: "sub-1",
          businessId: "biz-1",
          stripeCustomerId: "cus_abc",
          stripeSubscriptionId: "sub_xyz",
          status: "canceled",
        },
      ],
    });

    const status = await Effect.runPromise(
      Effect.provide(SubscriptionService.getGateStatus("biz-1", NOW), layer),
    );

    expect(status).toBe("suspended");
  });

  test("no subscription returns BusinessNotFound error", async () => {
    const { layer } = makeTestRepo();

    const result = await Effect.runPromise(
      Effect.either(
        Effect.provide(SubscriptionService.getGateStatus("biz-unknown", NOW), layer),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(BusinessNotFound);
    }
  });
});
