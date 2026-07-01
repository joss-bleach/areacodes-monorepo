import type { FilterBuilder, NamedTableInfo } from "convex/server";
import type { DataModel, Doc } from "../_generated/dataModel";

type VoucherFilterBuilder = FilterBuilder<NamedTableInfo<DataModel, "vouchers">>;

export function isActiveVoucher(q: VoucherFilterBuilder, now: number) {
  return q.and(
    q.eq(q.field("deletedAt"), undefined),
    q.eq(q.field("flaggedAt"), undefined),
    q.lte(q.field("voucherValidFrom"), now),
    q.gte(q.field("voucherValidTo"), now)
  );
}

// Customer visibility rule: a Voucher is listable to Customers iff not
// deleted/flagged, within its validity window, AND (manual OR provisioned).
// Nested object fields can't be filtered in Convex query filters, so this is a
// post-filter applied after the initial index/filter query.
export function isCustomerVisible(
  voucher: Doc<"vouchers">,
  now: number,
): boolean {
  if (voucher.deletedAt !== undefined) return false;
  if (voucher.flaggedAt !== undefined) return false;
  if (voucher.voucherValidFrom > now) return false;
  if (voucher.voucherValidTo < now) return false;
  return (
    voucher.provider === "manual" ||
    voucher.provisioning.status === "provisioned"
  );
}
