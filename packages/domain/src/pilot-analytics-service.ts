import { Context, Effect } from "effect";

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
  ) => Effect.Effect<Array<{ redeemedAt?: number | undefined }>>;
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
      const claims = yield* repo.getClaimsForVoucher(voucher.id);
      for (const claim of claims) {
        const reveals = yield* repo.getRevealsByClaim(claim.claimId);
        total += reveals.filter((r) => r.redeemedAt != null).length;
      }
    }
    return total;
  });

// A New Customer is a genuinely acquired customer: one whose first-ever claim
// at this business falls within the measurement period. With no pre-pilot claim
// data, every distinct customer who has claimed here was acquired during the
// pilot, so the count is the number of distinct claiming customers. Customers
// who returned (claimed more than once) are still acquired customers and are
// counted here as well as under getReturnCustomerCount.
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
      let redemptionCount = 0;
      for (const claim of claims) {
        const reveals = yield* repo.getRevealsByClaim(claim.claimId);
        revealCount += reveals.length;
        redemptionCount += reveals.filter((r) => r.redeemedAt != null).length;
      }
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
