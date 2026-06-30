import { Effect, Layer } from "effect";
import { describe, expect, test } from "vitest";
import {
  PilotAnalyticsRepo,
  AdminAnalyticsRepo,
  type IPilotAnalyticsRepo,
  type IAdminAnalyticsRepo,
} from "../pilot-analytics-service.js";
import * as PilotAnalyticsService from "../pilot-analytics-service.js";

// Monday 1970-01-05 00:00 UTC in ms
const MON_JAN_05 = 4 * 86400000;
// A timestamp within that week (Wednesday 1970-01-07)
const WED_JAN_07 = 6 * 86400000 + 3600000;
// Monday 1970-01-12 00:00 UTC in ms
const MON_JAN_12 = 11 * 86400000;
// A timestamp within that week (Wednesday 1970-01-14)
const WED_JAN_14 = 13 * 86400000 + 3600000;

function makeAdminTestRepo(data: {
  businesses?: Array<{ id: string; name: string }>;
  vouchers?: Array<{
    id: string;
    businessId: string;
    voucherFormat: string;
    deletedAt?: number;
  }>;
  claims?: Array<{
    claimId: string;
    customerId: string;
    voucherId: string;
    claimedAt: number;
  }>;
  reveals?: Array<{ claimId: string; revealedAt: number; redeemedAt?: number }>;
} = {}) {
  const repo: IAdminAnalyticsRepo = {
    getAllBusinesses: () => Effect.succeed(data.businesses ?? []),
    getAllVouchers: () => Effect.succeed(data.vouchers ?? []),
    getAllClaims: () => Effect.succeed(data.claims ?? []),
    getAllReveals: () => Effect.succeed(data.reveals ?? []),
  };
  return Layer.succeed(AdminAnalyticsRepo, repo);
}

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

// ── getWeeklyFunnel ───────────────────────────────────────────────────────────

describe("PilotAnalyticsService.getWeeklyFunnel", () => {
  test("returns empty array when no data exists", async () => {
    const layer = makeAdminTestRepo();

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getWeeklyFunnel(), layer),
    );

    expect(result).toEqual([]);
  });

  test("buckets claims by week", async () => {
    const layer = makeAdminTestRepo({
      claims: [
        { claimId: "c-1", customerId: "cust-1", voucherId: "v-1", claimedAt: WED_JAN_07 },
        { claimId: "c-2", customerId: "cust-2", voucherId: "v-1", claimedAt: WED_JAN_14 },
        { claimId: "c-3", customerId: "cust-3", voucherId: "v-1", claimedAt: WED_JAN_07 },
      ],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getWeeklyFunnel(), layer),
    );

    expect(result).toHaveLength(2);
    const week1 = result.find((r) => r.weekStart === MON_JAN_05)!;
    const week2 = result.find((r) => r.weekStart === MON_JAN_12)!;
    expect(week1.claimCount).toBe(2);
    expect(week2.claimCount).toBe(1);
  });

  test("buckets reveals and redemptions by their own timestamp", async () => {
    const layer = makeAdminTestRepo({
      claims: [
        { claimId: "c-1", customerId: "cust-1", voucherId: "v-1", claimedAt: WED_JAN_07 },
      ],
      reveals: [
        { claimId: "c-1", revealedAt: WED_JAN_07, redeemedAt: WED_JAN_14 },
      ],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getWeeklyFunnel(), layer),
    );

    const week1 = result.find((r) => r.weekStart === MON_JAN_05)!;
    const week2 = result.find((r) => r.weekStart === MON_JAN_12)!;
    expect(week1.claimCount).toBe(1);
    expect(week1.revealCount).toBe(1);
    expect(week1.redemptionCount).toBe(0);
    expect(week2.redemptionCount).toBe(1);
  });

  test("returns rows sorted by weekStart ascending", async () => {
    const layer = makeAdminTestRepo({
      claims: [
        { claimId: "c-1", customerId: "cust-1", voucherId: "v-1", claimedAt: WED_JAN_14 },
        { claimId: "c-2", customerId: "cust-2", voucherId: "v-1", claimedAt: WED_JAN_07 },
      ],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getWeeklyFunnel(), layer),
    );

    expect(result[0]!.weekStart).toBeLessThan(result[1]!.weekStart);
  });
});

// ── getBusinessLeaderboard ────────────────────────────────────────────────────

describe("PilotAnalyticsService.getBusinessLeaderboard", () => {
  test("returns empty array when no businesses exist", async () => {
    const layer = makeAdminTestRepo();

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getBusinessLeaderboard(), layer),
    );

    expect(result).toEqual([]);
  });

  test("ranks businesses by redemption count descending", async () => {
    const layer = makeAdminTestRepo({
      businesses: [
        { id: "biz-a", name: "Cafe A" },
        { id: "biz-b", name: "Cafe B" },
      ],
      vouchers: [
        { id: "v-a", businessId: "biz-a", voucherFormat: "barcode" },
        { id: "v-b", businessId: "biz-b", voucherFormat: "qr_code" },
      ],
      claims: [
        { claimId: "c-1", customerId: "cust-1", voucherId: "v-a", claimedAt: 1000 },
        { claimId: "c-2", customerId: "cust-2", voucherId: "v-b", claimedAt: 1000 },
        { claimId: "c-3", customerId: "cust-3", voucherId: "v-b", claimedAt: 1000 },
      ],
      reveals: [
        { claimId: "c-2", revealedAt: 2000, redeemedAt: 3000 },
        { claimId: "c-3", revealedAt: 2000, redeemedAt: 3000 },
      ],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getBusinessLeaderboard(), layer),
    );

    expect(result).toHaveLength(2);
    expect(result[0]!.businessId).toBe("biz-b");
    expect(result[0]!.redemptionCount).toBe(2);
    expect(result[1]!.businessId).toBe("biz-a");
    expect(result[1]!.redemptionCount).toBe(0);
  });

  test("flags businesses with zero claims as zero-activity", async () => {
    const layer = makeAdminTestRepo({
      businesses: [{ id: "biz-a", name: "Cafe A" }],
      vouchers: [{ id: "v-a", businessId: "biz-a", voucherFormat: "barcode" }],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getBusinessLeaderboard(), layer),
    );

    expect(result[0]!.hasZeroActivity).toBe(true);
  });

  test("flags businesses with only deleted vouchers as zero-activity", async () => {
    const layer = makeAdminTestRepo({
      businesses: [{ id: "biz-a", name: "Cafe A" }],
      vouchers: [
        { id: "v-a", businessId: "biz-a", voucherFormat: "barcode", deletedAt: 1000 },
      ],
      claims: [
        { claimId: "c-1", customerId: "cust-1", voucherId: "v-a", claimedAt: 1000 },
      ],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getBusinessLeaderboard(), layer),
    );

    expect(result[0]!.hasZeroActivity).toBe(true);
  });

  test("does not flag businesses that have claims and active vouchers", async () => {
    const layer = makeAdminTestRepo({
      businesses: [{ id: "biz-a", name: "Cafe A" }],
      vouchers: [{ id: "v-a", businessId: "biz-a", voucherFormat: "barcode" }],
      claims: [
        { claimId: "c-1", customerId: "cust-1", voucherId: "v-a", claimedAt: 1000 },
      ],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getBusinessLeaderboard(), layer),
    );

    expect(result[0]!.hasZeroActivity).toBe(false);
  });
});

// ── getCrossBusinessDiscoveryCount ────────────────────────────────────────────

describe("PilotAnalyticsService.getCrossBusinessDiscoveryCount", () => {
  test("returns 0 when there are no claims", async () => {
    const layer = makeAdminTestRepo();

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getCrossBusinessDiscoveryCount(), layer),
    );

    expect(result).toBe(0);
  });

  test("does not count customers who claimed from only one business", async () => {
    const layer = makeAdminTestRepo({
      vouchers: [{ id: "v-a", businessId: "biz-a", voucherFormat: "barcode" }],
      claims: [
        { claimId: "c-1", customerId: "cust-1", voucherId: "v-a", claimedAt: 1000 },
        { claimId: "c-2", customerId: "cust-1", voucherId: "v-a", claimedAt: 2000 },
      ],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getCrossBusinessDiscoveryCount(), layer),
    );

    expect(result).toBe(0);
  });

  test("counts customers who claimed from 2 or more distinct businesses", async () => {
    const layer = makeAdminTestRepo({
      vouchers: [
        { id: "v-a", businessId: "biz-a", voucherFormat: "barcode" },
        { id: "v-b", businessId: "biz-b", voucherFormat: "qr_code" },
      ],
      claims: [
        // cust-1: claimed from biz-a and biz-b → discovered
        { claimId: "c-1", customerId: "cust-1", voucherId: "v-a", claimedAt: 1000 },
        { claimId: "c-2", customerId: "cust-1", voucherId: "v-b", claimedAt: 2000 },
        // cust-2: only biz-a → not discovered
        { claimId: "c-3", customerId: "cust-2", voucherId: "v-a", claimedAt: 1000 },
      ],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getCrossBusinessDiscoveryCount(), layer),
    );

    expect(result).toBe(1);
  });
});

// ── getVoucherFormatBreakdown ─────────────────────────────────────────────────

describe("PilotAnalyticsService.getVoucherFormatBreakdown", () => {
  test("returns empty array when no claims exist", async () => {
    const layer = makeAdminTestRepo();

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getVoucherFormatBreakdown(), layer),
    );

    expect(result).toEqual([]);
  });

  test("groups claims by voucher format", async () => {
    const layer = makeAdminTestRepo({
      vouchers: [
        { id: "v-bar", businessId: "biz-a", voucherFormat: "barcode" },
        { id: "v-qr", businessId: "biz-a", voucherFormat: "qr_code" },
      ],
      claims: [
        { claimId: "c-1", customerId: "cust-1", voucherId: "v-bar", claimedAt: 1000 },
        { claimId: "c-2", customerId: "cust-2", voucherId: "v-bar", claimedAt: 1000 },
        { claimId: "c-3", customerId: "cust-3", voucherId: "v-qr", claimedAt: 1000 },
      ],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getVoucherFormatBreakdown(), layer),
    );

    const barcode = result.find((r) => r.format === "barcode")!;
    const qr = result.find((r) => r.format === "qr_code")!;
    expect(barcode.claimCount).toBe(2);
    expect(qr.claimCount).toBe(1);
  });

  test("groups redemptions by voucher format", async () => {
    const layer = makeAdminTestRepo({
      vouchers: [
        { id: "v-bar", businessId: "biz-a", voucherFormat: "barcode" },
        { id: "v-gen", businessId: "biz-a", voucherFormat: "generated_text" },
      ],
      claims: [
        { claimId: "c-1", customerId: "cust-1", voucherId: "v-bar", claimedAt: 1000 },
        { claimId: "c-2", customerId: "cust-2", voucherId: "v-gen", claimedAt: 1000 },
      ],
      reveals: [
        { claimId: "c-1", revealedAt: 2000, redeemedAt: 3000 },
        { claimId: "c-2", revealedAt: 2000 },
      ],
    });

    const result = await Effect.runPromise(
      Effect.provide(PilotAnalyticsService.getVoucherFormatBreakdown(), layer),
    );

    const barcode = result.find((r) => r.format === "barcode")!;
    const gen = result.find((r) => r.format === "generated_text")!;
    expect(barcode.redemptionCount).toBe(1);
    expect(gen.redemptionCount).toBe(0);
  });
});
