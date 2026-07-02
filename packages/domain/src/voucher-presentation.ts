export type VoucherStatus = "active" | "expiring" | "expired" | "scheduled";

const EXPIRING_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

export function voucherStatus(
  voucher: { voucherValidFrom: number; voucherValidTo: number },
  now: number
): VoucherStatus {
  if (voucher.voucherValidFrom > now) return "scheduled";
  if (voucher.voucherValidTo < now) return "expired";
  if (voucher.voucherValidTo - now <= EXPIRING_THRESHOLD_MS) return "expiring";
  return "active";
}
