import { Context, Effect } from "effect";

// ── Admin analytics types ──────────────────────────────────────────────────────

export interface WeeklyFunnelRow {
  weekStart: number;
  claimCount: number;
  revealCount: number;
  redemptionCount: number;
}

export interface BusinessLeaderboardEntry {
  businessId: string;
  businessName: string;
  claimCount: number;
  revealCount: number;
  redemptionCount: number;
  hasZeroActivity: boolean;
}

// ── Admin analytics repository interface ──────────────────────────────────────

export interface IAdminAnalyticsRepo {
  readonly getAllBusinesses: () => Effect.Effect<Array<{ id: string; name: string }>>;
  readonly getAllVouchers: () => Effect.Effect<
    Array<{ id: string; businessId: string; deletedAt?: number }>
  >;
  readonly getAllClaims: () => Effect.Effect<
    Array<{ claimId: string; customerId: string; voucherId: string; claimedAt: number }>
  >;
  readonly getAllReveals: () => Effect.Effect<
    Array<{ claimId: string; revealedAt: number }>
  >;
  readonly getAllRedemptionEvents: () => Effect.Effect<
    Array<{ businessId: string; occurredAt: number }>
  >;
}

export class AdminAnalyticsRepo extends Context.Tag(
  "@areacodes/domain/AdminAnalyticsRepo",
)<AdminAnalyticsRepo, IAdminAnalyticsRepo>() {}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoucherStat {
  voucherId: string;
  title: string;
  claimCount: number;
  revealCount: number;
  redemptionCount: number;
}

// ── Repository interface ──────────────────────────────────────────────────────

export interface IPilotAnalyticsRepo {
  readonly getVouchersForBusiness: (
    businessId: string,
  ) => Effect.Effect<Array<{ id: string; title: string }>>;
  readonly getClaimsForVoucher: (
    voucherId: string,
  ) => Effect.Effect<Array<{ claimId: string; customerId: string }>>;
  readonly getRevealsByClaim: (
    claimId: string,
  ) => Effect.Effect<Array<{ revealedAt: number }>>;
  readonly getRedemptionCountForVoucher: (
    voucherId: string,
  ) => Effect.Effect<number>;
}

export class PilotAnalyticsRepo extends Context.Tag(
  "@areacodes/domain/PilotAnalyticsRepo",
)<PilotAnalyticsRepo, IPilotAnalyticsRepo>() {}

// ── Service functions ─────────────────────────────────────────────────────────

export const getTotalRedemptions = (
  businessId: string,
): Effect.Effect<number, never, PilotAnalyticsRepo> =>
  Effect.gen(function* () {
    const repo = yield* PilotAnalyticsRepo;
    const vouchers = yield* repo.getVouchersForBusiness(businessId);
    let total = 0;
    for (const voucher of vouchers) {
      total += yield* repo.getRedemptionCountForVoucher(voucher.id);
    }
    return total;
  });

export const getNewCustomerCount = (
  businessId: string,
): Effect.Effect<number, never, PilotAnalyticsRepo> =>
  Effect.gen(function* () {
    const repo = yield* PilotAnalyticsRepo;
    const vouchers = yield* repo.getVouchersForBusiness(businessId);
    const customers = new Set<string>();
    for (const voucher of vouchers) {
      const claims = yield* repo.getClaimsForVoucher(voucher.id);
      for (const claim of claims) {
        customers.add(claim.customerId);
      }
    }
    return customers.size;
  });

export const getReturnCustomerCount = (
  businessId: string,
): Effect.Effect<number, never, PilotAnalyticsRepo> =>
  Effect.gen(function* () {
    const repo = yield* PilotAnalyticsRepo;
    const vouchers = yield* repo.getVouchersForBusiness(businessId);
    const claimCounts = new Map<string, number>();
    for (const voucher of vouchers) {
      const claims = yield* repo.getClaimsForVoucher(voucher.id);
      for (const claim of claims) {
        claimCounts.set(
          claim.customerId,
          (claimCounts.get(claim.customerId) ?? 0) + 1,
        );
      }
    }
    return [...claimCounts.values()].filter((count) => count >= 2).length;
  });

// ── Admin analytics helpers ───────────────────────────────────────────────────

function getWeekStart(ts: number): number {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun
  const daysFromMon = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysFromMon);
  return d.getTime();
}

// ── Admin analytics service functions ────────────────────────────────────────

export const getWeeklyFunnel = (): Effect.Effect<
  WeeklyFunnelRow[],
  never,
  AdminAnalyticsRepo
> =>
  Effect.gen(function* () {
    const repo = yield* AdminAnalyticsRepo;
    const claims = yield* repo.getAllClaims();
    const reveals = yield* repo.getAllReveals();
    const redemptionEvents = yield* repo.getAllRedemptionEvents();

    const weekData = new Map<number, WeeklyFunnelRow>();

    function getOrCreate(weekStart: number): WeeklyFunnelRow {
      let row = weekData.get(weekStart);
      if (!row) {
        row = { weekStart, claimCount: 0, revealCount: 0, redemptionCount: 0 };
        weekData.set(weekStart, row);
      }
      return row;
    }

    for (const claim of claims) {
      getOrCreate(getWeekStart(claim.claimedAt)).claimCount++;
    }

    for (const reveal of reveals) {
      getOrCreate(getWeekStart(reveal.revealedAt)).revealCount++;
    }

    for (const event of redemptionEvents) {
      getOrCreate(getWeekStart(event.occurredAt)).redemptionCount++;
    }

    return [...weekData.values()].sort((a, b) => a.weekStart - b.weekStart);
  });

export const getBusinessLeaderboard = (): Effect.Effect<
  BusinessLeaderboardEntry[],
  never,
  AdminAnalyticsRepo
> =>
  Effect.gen(function* () {
    const repo = yield* AdminAnalyticsRepo;
    const businesses = yield* repo.getAllBusinesses();
    const vouchers = yield* repo.getAllVouchers();
    const claims = yield* repo.getAllClaims();
    const reveals = yield* repo.getAllReveals();
    const redemptionEvents = yield* repo.getAllRedemptionEvents();

    const voucherToBusinessId = new Map(vouchers.map((v) => [v.id, v.businessId]));

    const businessesWithVouchers = new Set<string>();
    for (const voucher of vouchers) {
      if (!voucher.deletedAt) {
        businessesWithVouchers.add(voucher.businessId);
      }
    }

    const stats = new Map<
      string,
      { claimCount: number; revealCount: number; redemptionCount: number }
    >();
    for (const biz of businesses) {
      stats.set(biz.id, { claimCount: 0, revealCount: 0, redemptionCount: 0 });
    }

    const claimToBusinessId = new Map<string, string>();
    for (const claim of claims) {
      const businessId = voucherToBusinessId.get(claim.voucherId);
      if (!businessId) continue;
      claimToBusinessId.set(claim.claimId, businessId);
      const s = stats.get(businessId);
      if (s) s.claimCount++;
    }

    for (const reveal of reveals) {
      const businessId = claimToBusinessId.get(reveal.claimId);
      if (!businessId) continue;
      const s = stats.get(businessId);
      if (s) s.revealCount++;
    }

    for (const event of redemptionEvents) {
      const s = stats.get(event.businessId);
      if (s) s.redemptionCount++;
    }

    const entries: BusinessLeaderboardEntry[] = businesses.map((biz) => {
      const s = stats.get(biz.id) ?? { claimCount: 0, revealCount: 0, redemptionCount: 0 };
      return {
        businessId: biz.id,
        businessName: biz.name,
        ...s,
        hasZeroActivity: s.claimCount === 0 || !businessesWithVouchers.has(biz.id),
      };
    });

    return entries.sort((a, b) => b.redemptionCount - a.redemptionCount);
  });

export const getCrossBusinessDiscoveryCount = (): Effect.Effect<
  number,
  never,
  AdminAnalyticsRepo
> =>
  Effect.gen(function* () {
    const repo = yield* AdminAnalyticsRepo;
    const vouchers = yield* repo.getAllVouchers();
    const claims = yield* repo.getAllClaims();

    const voucherToBusinessId = new Map(vouchers.map((v) => [v.id, v.businessId]));
    const customerBusinesses = new Map<string, Set<string>>();

    for (const claim of claims) {
      const businessId = voucherToBusinessId.get(claim.voucherId);
      if (!businessId) continue;
      let bizSet = customerBusinesses.get(claim.customerId);
      if (!bizSet) {
        bizSet = new Set();
        customerBusinesses.set(claim.customerId, bizSet);
      }
      bizSet.add(businessId);
    }

    return [...customerBusinesses.values()].filter((s) => s.size >= 2).length;
  });

export const getVoucherStats = (
  businessId: string,
): Effect.Effect<VoucherStat[], never, PilotAnalyticsRepo> =>
  Effect.gen(function* () {
    const repo = yield* PilotAnalyticsRepo;
    const vouchers = yield* repo.getVouchersForBusiness(businessId);
    const stats: VoucherStat[] = [];
    for (const voucher of vouchers) {
      const claims = yield* repo.getClaimsForVoucher(voucher.id);
      let revealCount = 0;
      for (const claim of claims) {
        const reveals = yield* repo.getRevealsByClaim(claim.claimId);
        revealCount += reveals.length;
      }
      const redemptionCount = yield* repo.getRedemptionCountForVoucher(voucher.id);
      stats.push({
        voucherId: voucher.id,
        title: voucher.title,
        claimCount: claims.length,
        revealCount,
        redemptionCount,
      });
    }
    return stats;
  });
