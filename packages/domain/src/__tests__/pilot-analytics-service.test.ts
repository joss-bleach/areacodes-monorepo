import { Effect, Layer } from "effect";
import { describe, expect, test } from "vitest";
import {
  PilotAnalyticsRepo,
  type IPilotAnalyticsRepo,
} from "../pilot-analytics-service.js";
import * as PilotAnalyticsService from "../pilot-analytics-service.js";

type VoucherEntry = { id: string; title: string };
type ClaimEntry = { claimId: string; customerId: string };
type RevealEntry = { redeemedAt?: number };

function makeTestRepo(data: {
  vouchers?: Map<string, VoucherEntry[]>;
  claims?: Map<string, ClaimEntry[]>;
  reveals?: Map<string, RevealEntry[]>;
} = {}) {
  const voucherMap = data.vouchers ?? new Map<string, VoucherEntry[]>();
  const claimMap = data.claims ?? new Map<string, ClaimEntry[]>();
  const revealMap = data.reveals ?? new Map<string, RevealEntry[]>();

  const repo: IPilotAnalyticsRepo = {
    getVouchersForBusiness: (businessId) =>
      Effect.succeed(voucherMap.get(businessId) ?? []),
    getClaimsForVoucher: (voucherId) =>
      Effect.succeed(claimMap.get(voucherId) ?? []),
    getRevealsByClaim: (claimId) =>
      Effect.succeed(revealMap.get(claimId) ?? []),
  };

  return Layer.succeed(PilotAnalyticsRepo, repo);
}

// ── getTotalRedemptions ───────────────────────────────────────────────────────

describe("PilotAnalyticsService.getTotalRedemptions", () => {
  test("returns 0 when business has no vouchers", async () => {
    const layer = makeTestRepo();

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getTotalRedemptions("biz-1"), layer),
    );

    expect(result).toBe(0);
  });

  test("returns 0 when vouchers have no claims", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([["biz-1", [{ id: "v-1", title: "10% Off" }]]]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getTotalRedemptions("biz-1"), layer),
    );

    expect(result).toBe(0);
  });

  test("returns 0 when claims have no redeemed reveals", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([["biz-1", [{ id: "v-1", title: "10% Off" }]]]),
      claims: new Map([["v-1", [{ claimId: "c-1", customerId: "cust-1" }]]]),
      reveals: new Map([["c-1", [{ redeemedAt: undefined }]]]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getTotalRedemptions("biz-1"), layer),
    );

    expect(result).toBe(0);
  });

  test("counts redeemed reveals", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([["biz-1", [{ id: "v-1", title: "10% Off" }]]]),
      claims: new Map([["v-1", [{ claimId: "c-1", customerId: "cust-1" }]]]),
      reveals: new Map([["c-1", [{ redeemedAt: 1000 }]]]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getTotalRedemptions("biz-1"), layer),
    );

    expect(result).toBe(1);
  });

  test("counts redemptions across multiple vouchers and claims", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([
        [
          "biz-1",
          [
            { id: "v-1", title: "10% Off" },
            { id: "v-2", title: "Free Coffee" },
          ],
        ],
      ]),
      claims: new Map([
        [
          "v-1",
          [
            { claimId: "c-1", customerId: "cust-1" },
            { claimId: "c-2", customerId: "cust-2" },
          ],
        ],
        ["v-2", [{ claimId: "c-3", customerId: "cust-1" }]],
      ]),
      reveals: new Map([
        ["c-1", [{ redeemedAt: 1000 }]],
        ["c-2", []],
        ["c-3", [{ redeemedAt: 2000 }]],
      ]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getTotalRedemptions("biz-1"), layer),
    );

    expect(result).toBe(2);
  });
});

// ── getNewCustomerCount ───────────────────────────────────────────────────────

describe("PilotAnalyticsService.getNewCustomerCount", () => {
  test("returns 0 when no claims exist", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([["biz-1", [{ id: "v-1", title: "10% Off" }]]]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getNewCustomerCount("biz-1"), layer),
    );

    expect(result).toBe(0);
  });

  test("counts customers with exactly one claim across all vouchers", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([
        [
          "biz-1",
          [
            { id: "v-1", title: "10% Off" },
            { id: "v-2", title: "Free Coffee" },
          ],
        ],
      ]),
      claims: new Map([
        ["v-1", [{ claimId: "c-1", customerId: "cust-1" }]],
        ["v-2", [{ claimId: "c-2", customerId: "cust-2" }]],
      ]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getNewCustomerCount("biz-1"), layer),
    );

    expect(result).toBe(2);
  });

  test("counts a returning customer as acquired (deduplicated across claims)", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([
        [
          "biz-1",
          [
            { id: "v-1", title: "10% Off" },
            { id: "v-2", title: "Free Coffee" },
          ],
        ],
      ]),
      claims: new Map([
        [
          "v-1",
          [
            { claimId: "c-1", customerId: "cust-return" },
            { claimId: "c-2", customerId: "cust-new" },
          ],
        ],
        ["v-2", [{ claimId: "c-3", customerId: "cust-return" }]],
      ]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getNewCustomerCount("biz-1"), layer),
    );

    // Two distinct customers were acquired: cust-return and cust-new. The
    // returning customer is counted once despite claiming twice.
    expect(result).toBe(2);
  });

  test("counts each distinct customer once even when all of them return", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([
        [
          "biz-1",
          [
            { id: "v-1", title: "10% Off" },
            { id: "v-2", title: "Free Coffee" },
          ],
        ],
      ]),
      claims: new Map([
        ["v-1", [{ claimId: "c-1", customerId: "cust-a" }]],
        ["v-2", [{ claimId: "c-2", customerId: "cust-a" }]],
      ]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getNewCustomerCount("biz-1"), layer),
    );

    expect(result).toBe(1);
  });
});

// ── getReturnCustomerCount ────────────────────────────────────────────────────

describe("PilotAnalyticsService.getReturnCustomerCount", () => {
  test("returns 0 when no claims exist", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([["biz-1", [{ id: "v-1", title: "10% Off" }]]]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getReturnCustomerCount("biz-1"), layer),
    );

    expect(result).toBe(0);
  });

  test("does not count customers with only one claim", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([["biz-1", [{ id: "v-1", title: "10% Off" }]]]),
      claims: new Map([
        ["v-1", [{ claimId: "c-1", customerId: "cust-1" }]],
      ]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getReturnCustomerCount("biz-1"), layer),
    );

    expect(result).toBe(0);
  });

  test("counts customers with 2 or more claims", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([
        [
          "biz-1",
          [
            { id: "v-1", title: "10% Off" },
            { id: "v-2", title: "Free Coffee" },
          ],
        ],
      ]),
      claims: new Map([
        [
          "v-1",
          [
            { claimId: "c-1", customerId: "cust-return" },
            { claimId: "c-2", customerId: "cust-new" },
          ],
        ],
        ["v-2", [{ claimId: "c-3", customerId: "cust-return" }]],
      ]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getReturnCustomerCount("biz-1"), layer),
    );

    expect(result).toBe(1);
  });

  test("a customer with 3 or more claims counts as one return customer", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([
        [
          "biz-1",
          [
            { id: "v-1", title: "V1" },
            { id: "v-2", title: "V2" },
            { id: "v-3", title: "V3" },
          ],
        ],
      ]),
      claims: new Map([
        ["v-1", [{ claimId: "c-1", customerId: "cust-loyal" }]],
        ["v-2", [{ claimId: "c-2", customerId: "cust-loyal" }]],
        ["v-3", [{ claimId: "c-3", customerId: "cust-loyal" }]],
      ]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getReturnCustomerCount("biz-1"), layer),
    );

    expect(result).toBe(1);
  });
});

// ── getVoucherStats ───────────────────────────────────────────────────────────

describe("PilotAnalyticsService.getVoucherStats", () => {
  test("returns empty array for business with no vouchers", async () => {
    const layer = makeTestRepo();

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getVoucherStats("biz-1"), layer),
    );

    expect(result).toEqual([]);
  });

  test("returns per-voucher claim count", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([["biz-1", [{ id: "v-1", title: "10% Off" }]]]),
      claims: new Map([
        [
          "v-1",
          [
            { claimId: "c-1", customerId: "cust-1" },
            { claimId: "c-2", customerId: "cust-2" },
          ],
        ],
      ]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getVoucherStats("biz-1"), layer),
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.claimCount).toBe(2);
    expect(result[0]!.title).toBe("10% Off");
  });

  test("returns per-voucher reveal and redemption counts", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([["biz-1", [{ id: "v-1", title: "10% Off" }]]]),
      claims: new Map([
        [
          "v-1",
          [
            { claimId: "c-1", customerId: "cust-1" },
            { claimId: "c-2", customerId: "cust-2" },
          ],
        ],
      ]),
      reveals: new Map([
        ["c-1", [{ redeemedAt: 1000 }]],
        ["c-2", [{ redeemedAt: undefined }]],
      ]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getVoucherStats("biz-1"), layer),
    );

    expect(result[0]!.revealCount).toBe(2);
    expect(result[0]!.redemptionCount).toBe(1);
  });

  test("returns stats for multiple vouchers", async () => {
    const layer = makeTestRepo({
      vouchers: new Map([
        [
          "biz-1",
          [
            { id: "v-1", title: "10% Off" },
            { id: "v-2", title: "Free Coffee" },
          ],
        ],
      ]),
      claims: new Map([
        ["v-1", [{ claimId: "c-1", customerId: "cust-1" }]],
        [
          "v-2",
          [
            { claimId: "c-2", customerId: "cust-2" },
            { claimId: "c-3", customerId: "cust-3" },
          ],
        ],
      ]),
      reveals: new Map([
        ["c-1", [{ redeemedAt: 1000 }]],
        ["c-2", [{ redeemedAt: 2000 }]],
        ["c-3", []],
      ]),
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getVoucherStats("biz-1"), layer),
    );

    expect(result).toHaveLength(2);
    const v1 = result.find((s) => s.voucherId === "v-1")!;
    const v2 = result.find((s) => s.voucherId === "v-2")!;

    expect(v1.claimCount).toBe(1);
    expect(v1.revealCount).toBe(1);
    expect(v1.redemptionCount).toBe(1);

    expect(v2.claimCount).toBe(2);
    expect(v2.revealCount).toBe(1);
    expect(v2.redemptionCount).toBe(1);
  });
});
