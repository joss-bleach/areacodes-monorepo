export function isVoucherClaimable(
  voucherValidFrom: number,
  voucherValidTo: number,
  now = Date.now()
): boolean {
  return now >= voucherValidFrom && now <= voucherValidTo;
}

export function formatValidityWindow(
  voucherValidFrom: number,
  voucherValidTo: number
): string {
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(voucherValidFrom)} – ${fmt(voucherValidTo)}`;
}
