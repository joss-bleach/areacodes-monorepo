export type VoucherStatus = "active" | "expiring" | "expired" | "scheduled";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function voucherStatus(
  voucher: { voucherValidFrom: number; voucherValidTo: number },
  now: number
): VoucherStatus {
  if (voucher.voucherValidFrom > now) return "scheduled";
  if (voucher.voucherValidTo < now) return "expired";
  if (voucher.voucherValidTo - now <= THIRTY_DAYS_MS) return "expiring";
  return "active";
}
