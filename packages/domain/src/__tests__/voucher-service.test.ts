import { Effect, Either, Layer } from "effect";
import { describe, expect, test } from "vitest";
import {
  VoucherRepo,
  ClaimRepo,
  RevealRepo,
  type BusinessRef,
  type IVoucherRepo,
  type VoucherDoc,
  type IClaimRepo,
  type ClaimDoc,
  type IRevealRepo,
  type RevealDoc,
} from "../voucher-service.js";
import * as VoucherService from "../voucher-service.js";
import { SubscriptionRepo, type ISubscriptionRepo, type SubscriptionDoc } from "../subscription-service.js";

function makeTestRepo(options: {
  businesses?: BusinessRef[];
  vouchers?: VoucherDoc[];
}) {
  const businesses = [...(options.businesses ?? [])];
  const vouchers = [...(options.vouchers ?? [])];
  let nextId = 1;

  const repo: IVoucherRepo = {
    findBusiness: (id) =>
      Effect.succeed(businesses.find((b) => b._id === id) ?? null),
    findById: (id) =>
      Effect.succeed(vouchers.find((v) => v._id === id) ?? null),
    insert: (data) => {
      const id = `voucher-${nextId++}`;
      vouchers.push({ ...data, _id: id });
      return Effect.succeed(id);
    },
    patch: (id, data) => {
      const idx = vouchers.findIndex((v) => v._id === id);
      if (idx !== -1) {
        vouchers[idx] = { ...vouchers[idx]!, ...data };
      }
      return Effect.void;
    },
  };

  const layer = Layer.succeed(VoucherRepo, repo);
  return { layer, businesses, vouchers };
}

const baseArgs = {
  title: "10% Off",
  description: "Get 10% off your order",
  provider: "manual" as const,
  discount: { kind: "custom" as const, customText: "10% off" },
  voucherValidFrom: 1_000_000,
  voucherValidTo: 2_000_000,
};

const existingBusiness = (overrides: Partial<BusinessRef> = {}): BusinessRef => ({
  _id: "biz-1",
  userId: "user-owner",
  ...overrides,
});

const existingVoucher = (overrides: Partial<VoucherDoc> = {}): VoucherDoc => ({
  _id: "voucher-existing",
  businessId: "biz-1",
  userId: "user-owner",
  title: "Old Title",
  description: "Old description",
  provider: "manual",
  discount: { kind: "custom", customText: "old deal" },
  provisioning: { status: "not_required" },
  voucherValidFrom: 1_000_000,
  voucherValidTo: 2_000_000,
  ...overrides,
});

describe("VoucherService.create", () => {
  test("happy path: voucher created and linked to business", async () => {
    const { layer, vouchers } = makeTestRepo({
      businesses: [existingBusiness()],
    });

    const id = await Effect.runPromise(
      Effect.provide(
        VoucherService.create("user-owner", "biz-1", baseArgs),
        layer,
      ),
    );

    expect(id).toBe("voucher-1");
    expect(vouchers[0]).toMatchObject({
      _id: "voucher-1",
      businessId: "biz-1",
      userId: "user-owner",
      title: "10% Off",
    });
  });

  test("sets provisioning.status to not_required for manual provider", async () => {
    const { layer, vouchers } = makeTestRepo({
      businesses: [existingBusiness()],
    });

    await Effect.runPromise(
      Effect.provide(
        VoucherService.create("user-owner", "biz-1", { ...baseArgs, provider: "manual" }),
        layer,
      ),
    );

    expect(vouchers[0]!.provisioning.status).toBe("not_required");
  });

  test("sets provisioning.status to pending for square provider", async () => {
    const { layer, vouchers } = makeTestRepo({
      businesses: [existingBusiness()],
    });

    await Effect.runPromise(
      Effect.provide(
        VoucherService.create("user-owner", "biz-1", {
          ...baseArgs,
          provider: "square",
          discount: { kind: "percentage", value: 10 },
        }),
        layer,
      ),
    );

    expect(vouchers[0]!.provisioning.status).toBe("pending");
  });

  test("returns Unauthorized when caller does not own the business", async () => {
    const { layer } = makeTestRepo({
      businesses: [existingBusiness({ userId: "user-owner" })],
    });

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.create("wrong-user", "biz-1", baseArgs)),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("Unauthorized");
    }
  });
});

describe("VoucherService.update", () => {
  test("patches discount and dates on existing voucher", async () => {
    const { layer, vouchers } = makeTestRepo({
      vouchers: [existingVoucher({ _id: "v-1", userId: "user-1" })],
    });

    await Effect.runPromise(
      Effect.provide(
        VoucherService.update("user-1", "v-1", {
          title: "New Title",
          description: "New desc",
          discount: { kind: "percentage", value: 20 },
          voucherValidFrom: 1_000_000,
          voucherValidTo: 3_000_000,
        }),
        layer,
      ),
    );

    expect(vouchers[0]!.title).toBe("New Title");
    expect(vouchers[0]!.discount).toEqual({ kind: "percentage", value: 20 });
  });

  test("returns NotFound for a non-existent voucher", async () => {
    const { layer } = makeTestRepo({});

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.update("user-1", "nonexistent", {
          title: "X",
          description: "X",
          discount: { kind: "custom", customText: "x" },
          voucherValidFrom: 1,
          voucherValidTo: 2,
        })),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("NotFound");
    }
  });

  test("returns Unauthorized when owner does not match", async () => {
    const { layer } = makeTestRepo({
      vouchers: [existingVoucher({ _id: "v-1", userId: "user-owner" })],
    });

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.update("wrong-user", "v-1", {
          title: "X",
          description: "X",
          discount: { kind: "custom", customText: "x" },
          voucherValidFrom: 1,
          voucherValidTo: 2,
        })),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("Unauthorized");
    }
  });
});

describe("VoucherService.softDelete", () => {
  test("sets deletedAt on the voucher", async () => {
    const { layer, vouchers } = makeTestRepo({
      vouchers: [existingVoucher({ _id: "v-1", userId: "user-1" })],
    });

    await Effect.runPromise(
      Effect.provide(VoucherService.softDelete("user-1", "v-1"), layer),
    );

    expect(vouchers[0]!.deletedAt).toBeTypeOf("number");
  });

  test("returns NotFound for a non-existent voucher", async () => {
    const { layer } = makeTestRepo({});

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.softDelete("user-1", "nonexistent")),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("NotFound");
    }
  });

  test("returns Unauthorized when owner does not match", async () => {
    const { layer } = makeTestRepo({
      vouchers: [existingVoucher({ _id: "v-1", userId: "user-owner" })],
    });

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.softDelete("wrong-user", "v-1")),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("Unauthorized");
    }
  });
});

// ── Test helpers for claim/reveal/wallet ─────────────────────────────────────

function makeTestClaimRepo(options: {
  claims?: ClaimDoc[];
}) {
  const claims = [...(options.claims ?? [])];
  let nextId = 1;

  const repo: IClaimRepo = {
    findByCustomerVoucher: (customerId, voucherId) =>
      Effect.succeed(
        claims.find((c) => c.customerId === customerId && c.voucherId === voucherId) ?? null,
      ),
    findById: (id) =>
      Effect.succeed(claims.find((c) => c._id === id) ?? null),
    findByCustomer: (customerId) =>
      Effect.succeed(claims.filter((c) => c.customerId === customerId)),
    insert: (data) => {
      const id = `claim-${nextId++}`;
      claims.push({ ...data, _id: id });
      return Effect.succeed(id);
    },
  };

  const layer = Layer.succeed(ClaimRepo, repo);
  return { layer, claims };
}

function makeTestRevealRepo(options: {
  reveals?: RevealDoc[];
}) {
  const reveals = [...(options.reveals ?? [])];
  let nextId = 1;

  const repo: IRevealRepo = {
    findByClaim: (claimId) => {
      const matches = reveals.filter((r) => r.claimId === claimId);
      return Effect.succeed(matches[matches.length - 1] ?? null);
    },
    insert: (data) => {
      const id = `reveal-${nextId++}`;
      reveals.push({ ...data, _id: id });
      return Effect.succeed(id);
    },
  };

  const layer = Layer.succeed(RevealRepo, repo);
  return { layer, reveals };
}

function makeTestSubscriptionRepo(options: { subscriptions?: SubscriptionDoc[] } = {}) {
  const subscriptions = [...(options.subscriptions ?? [])];

  const repo: ISubscriptionRepo = {
    findByBusiness: (businessId) =>
      Effect.succeed(subscriptions.find((s) => s.businessId === businessId) ?? null),
    findByStripeCustomer: () => Effect.succeed(null),
    findByStripeSubscription: () => Effect.succeed(null),
    insert: () => Effect.succeed("test-sub-id"),
    patch: () => Effect.void,
  };

  const layer = Layer.succeed(SubscriptionRepo, repo);
  return { layer, subscriptions };
}

const NOW = 1_500_000;
const VOUCHER_VALID = { voucherValidFrom: 1_000_000, voucherValidTo: 2_000_000 };
const VOUCHER_EXPIRED_RANGE = { voucherValidFrom: 500_000, voucherValidTo: 1_000_000 };

const activeVoucher = (overrides: Partial<VoucherDoc> = {}): VoucherDoc => ({
  _id: "voucher-active",
  businessId: "biz-1",
  userId: "user-owner",
  title: "10% Off",
  description: "Get 10% off",
  provider: "manual",
  discount: { kind: "custom", customText: "10% off" },
  provisioning: { status: "not_required" },
  ...VOUCHER_VALID,
  ...overrides,
});

const expiredVoucher = (overrides: Partial<VoucherDoc> = {}): VoucherDoc => ({
  _id: "voucher-expired",
  businessId: "biz-1",
  userId: "user-owner",
  title: "Expired Offer",
  description: "No longer valid",
  provider: "manual",
  discount: { kind: "custom", customText: "expired" },
  provisioning: { status: "not_required" },
  ...VOUCHER_EXPIRED_RANGE,
  ...overrides,
});

const existingClaim = (overrides: Partial<ClaimDoc> = {}): ClaimDoc => ({
  _id: "claim-1",
  customerId: "customer-1",
  voucherId: "voucher-active",
  claimedAt: 1_200_000,
  ...overrides,
});

// ── VoucherService.claim ──────────────────────────────────────────────────────

describe("VoucherService.claim", () => {
  test("happy path: claim created and returns claimId", async () => {
    const { layer: voucherLayer } = makeTestRepo({
      vouchers: [activeVoucher()],
    });
    const { layer: claimLayer, claims } = makeTestClaimRepo({});

    const layer = Layer.mergeAll(voucherLayer, claimLayer);

    const claimId = await Effect.runPromise(
      Effect.provide(VoucherService.claim("customer-1", "voucher-active", NOW), layer),
    );

    expect(claimId).toBe("claim-1");
    expect(claims[0]).toMatchObject({
      customerId: "customer-1",
      voucherId: "voucher-active",
    });
  });

  test("idempotent: returns existing claimId on repeat call", async () => {
    const { layer: voucherLayer } = makeTestRepo({
      vouchers: [activeVoucher()],
    });
    const { layer: claimLayer, claims } = makeTestClaimRepo({
      claims: [existingClaim()],
    });

    const layer = Layer.mergeAll(voucherLayer, claimLayer);

    const claimId = await Effect.runPromise(
      Effect.provide(VoucherService.claim("customer-1", "voucher-active", NOW), layer),
    );

    expect(claimId).toBe("claim-1");
    expect(claims).toHaveLength(1);
  });

  test("returns VoucherExpired when validTo < now", async () => {
    const { layer: voucherLayer } = makeTestRepo({
      vouchers: [expiredVoucher()],
    });
    const { layer: claimLayer } = makeTestClaimRepo({});

    const layer = Layer.mergeAll(voucherLayer, claimLayer);

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.claim("customer-1", "voucher-expired", NOW)),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("VoucherExpired");
    }
  });
});

// ── VoucherService.reveal ─────────────────────────────────────────────────────

describe("VoucherService.reveal", () => {
  test("happy path: generates 12-char uppercase code with 2h expiry", async () => {
    const { layer: voucherLayer } = makeTestRepo({ vouchers: [activeVoucher()] });
    const { layer: claimLayer } = makeTestClaimRepo({ claims: [existingClaim()] });
    const { layer: revealLayer, reveals } = makeTestRevealRepo({});
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo();

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const result = await Effect.runPromise(
      Effect.provide(VoucherService.reveal("claim-1", NOW), layer),
    );

    expect(result.voucherCode).toMatch(/^[A-Z0-9]{12}$/);
    expect(result.expiresAt).toBe(NOW + 2 * 60 * 60 * 1000);
    expect(reveals[0]?.voucherCode).toBe(result.voucherCode);
  });

  test("returns AlreadyRevealed when unexpired reveal exists", async () => {
    const unexpiredReveal: RevealDoc = {
      _id: "reveal-existing",
      claimId: "claim-1",
      voucherCode: "EXISTINGCODE",
      revealedAt: NOW - 1000,
      expiresAt: NOW + 7_199_000,
    };

    const { layer: voucherLayer } = makeTestRepo({ vouchers: [activeVoucher()] });
    const { layer: claimLayer } = makeTestClaimRepo({ claims: [existingClaim()] });
    const { layer: revealLayer } = makeTestRevealRepo({ reveals: [unexpiredReveal] });
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo();

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.reveal("claim-1", NOW)),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("AlreadyRevealed");
    }
  });

  test("allows re-reveal when existing reveal is expired", async () => {
    const expiredReveal: RevealDoc = {
      _id: "reveal-expired",
      claimId: "claim-1",
      voucherCode: "OLDEXPIREDCOD",
      revealedAt: NOW - 3 * 60 * 60 * 1000,
      expiresAt: NOW - 1000,
    };

    const { layer: voucherLayer } = makeTestRepo({ vouchers: [activeVoucher()] });
    const { layer: claimLayer } = makeTestClaimRepo({ claims: [existingClaim()] });
    const { layer: revealLayer, reveals } = makeTestRevealRepo({ reveals: [expiredReveal] });
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo();

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const result = await Effect.runPromise(
      Effect.provide(VoucherService.reveal("claim-1", NOW), layer),
    );

    expect(result.voucherCode).toMatch(/^[A-Z0-9]{12}$/);
    expect(reveals).toHaveLength(2);
  });

  test("returns ClaimNotFound for unknown claimId", async () => {
    const { layer: voucherLayer } = makeTestRepo({});
    const { layer: claimLayer } = makeTestClaimRepo({});
    const { layer: revealLayer } = makeTestRevealRepo({});
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo();

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.reveal("nonexistent", NOW)),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("ClaimNotFound");
    }
  });

  test("returns VouchersSuspended when business subscription is past_due beyond 7-day grace", async () => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const suspendedSub: SubscriptionDoc = {
      _id: "sub-1",
      businessId: "biz-1",
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_xyz",
      status: "past_due",
      currentPeriodEnd: NOW - (SEVEN_DAYS_MS + 1000), // 7 days + 1s ago → suspended
    };

    const { layer: voucherLayer } = makeTestRepo({ vouchers: [activeVoucher()] });
    const { layer: claimLayer } = makeTestClaimRepo({ claims: [existingClaim()] });
    const { layer: revealLayer } = makeTestRevealRepo({});
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo({ subscriptions: [suspendedSub] });

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.reveal("claim-1", NOW)),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("VouchersSuspended");
    }
  });

  test("succeeds for past_due business within 7-day grace period", async () => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const graceWindowSub: SubscriptionDoc = {
      _id: "sub-1",
      businessId: "biz-1",
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_xyz",
      status: "past_due",
      currentPeriodEnd: NOW - (SEVEN_DAYS_MS - 1000), // 3 days ago → still within grace
    };

    const { layer: voucherLayer } = makeTestRepo({ vouchers: [activeVoucher()] });
    const { layer: claimLayer } = makeTestClaimRepo({ claims: [existingClaim()] });
    const { layer: revealLayer } = makeTestRevealRepo({});
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo({ subscriptions: [graceWindowSub] });

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const result = await Effect.runPromise(
      Effect.provide(VoucherService.reveal("claim-1", NOW), layer),
    );

    expect(result.voucherCode).toMatch(/^[A-Z0-9]{12}$/);
  });

  test("succeeds when business has no subscription (pilot / no billing)", async () => {
    const { layer: voucherLayer } = makeTestRepo({ vouchers: [activeVoucher()] });
    const { layer: claimLayer } = makeTestClaimRepo({ claims: [existingClaim()] });
    const { layer: revealLayer } = makeTestRevealRepo({});
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo(); // no subscriptions

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const result = await Effect.runPromise(
      Effect.provide(VoucherService.reveal("claim-1", NOW), layer),
    );

    expect(result.voucherCode).toMatch(/^[A-Z0-9]{12}$/);
  });
});

// ── VoucherService.getWallet ──────────────────────────────────────────────────

describe("VoucherService.getWallet", () => {
  test("returns empty array for a customer with no claims", async () => {
    const { layer: voucherLayer } = makeTestRepo({});
    const { layer: claimLayer } = makeTestClaimRepo({});
    const { layer: revealLayer } = makeTestRevealRepo({});
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo();

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const wallet = await Effect.runPromise(
      Effect.provide(VoucherService.getWallet("customer-1", NOW), layer),
    );

    expect(wallet).toHaveLength(0);
  });

  test("claimed state: claim with no reveal", async () => {
    const { layer: voucherLayer } = makeTestRepo({ vouchers: [activeVoucher()] });
    const { layer: claimLayer } = makeTestClaimRepo({ claims: [existingClaim()] });
    const { layer: revealLayer } = makeTestRevealRepo({});
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo();

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const wallet = await Effect.runPromise(
      Effect.provide(VoucherService.getWallet("customer-1", NOW), layer),
    );

    expect(wallet).toHaveLength(1);
    expect(wallet[0]!.state).toBe("claimed");
    expect(wallet[0]!.activeCode).toBeNull();
  });

  test("revealed state: claim with active (unexpired) reveal", async () => {
    const activeReveal: RevealDoc = {
      _id: "reveal-1",
      claimId: "claim-1",
      voucherCode: "ACTIVEREVEAL1",
      revealedAt: NOW - 1000,
      expiresAt: NOW + 7_199_000,
    };

    const { layer: voucherLayer } = makeTestRepo({ vouchers: [activeVoucher()] });
    const { layer: claimLayer } = makeTestClaimRepo({ claims: [existingClaim()] });
    const { layer: revealLayer } = makeTestRevealRepo({ reveals: [activeReveal] });
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo();

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const wallet = await Effect.runPromise(
      Effect.provide(VoucherService.getWallet("customer-1", NOW), layer),
    );

    expect(wallet).toHaveLength(1);
    expect(wallet[0]!.state).toBe("revealed");
    expect(wallet[0]!.activeCode).toBe("ACTIVEREVEAL1");
    expect(wallet[0]!.codeExpiresAt).toBe(NOW + 7_199_000);
  });

  test("expired state: voucher past its validTo", async () => {
    const claim = existingClaim({ voucherId: "voucher-expired" });
    const { layer: voucherLayer } = makeTestRepo({ vouchers: [expiredVoucher()] });
    const { layer: claimLayer } = makeTestClaimRepo({ claims: [claim] });
    const { layer: revealLayer } = makeTestRevealRepo({});
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo();

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const wallet = await Effect.runPromise(
      Effect.provide(VoucherService.getWallet("customer-1", NOW), layer),
    );

    expect(wallet).toHaveLength(1);
    expect(wallet[0]!.state).toBe("expired");
    expect(wallet[0]!.activeCode).toBeNull();
  });

  test("suspended state: business subscription is past_due beyond 7-day grace", async () => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const suspendedSub: SubscriptionDoc = {
      _id: "sub-1",
      businessId: "biz-1",
      stripeCustomerId: "cus_abc",
      stripeSubscriptionId: "sub_xyz",
      status: "past_due",
      currentPeriodEnd: NOW - (SEVEN_DAYS_MS + 1000),
    };

    const { layer: voucherLayer } = makeTestRepo({ vouchers: [activeVoucher()] });
    const { layer: claimLayer } = makeTestClaimRepo({ claims: [existingClaim()] });
    const { layer: revealLayer } = makeTestRevealRepo({});
    const { layer: subscriptionLayer } = makeTestSubscriptionRepo({ subscriptions: [suspendedSub] });

    const layer = Layer.mergeAll(voucherLayer, claimLayer, revealLayer, subscriptionLayer);

    const wallet = await Effect.runPromise(
      Effect.provide(VoucherService.getWallet("customer-1", NOW), layer),
    );

    expect(wallet).toHaveLength(1);
    expect(wallet[0]!.state).toBe("suspended");
    expect(wallet[0]!.activeCode).toBeNull();
  });
});
