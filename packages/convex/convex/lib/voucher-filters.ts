import type { FilterBuilder, NamedTableInfo } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type VoucherFilterBuilder = FilterBuilder<NamedTableInfo<DataModel, "vouchers">>;

export function isActiveVoucher(q: VoucherFilterBuilder, now: number) {
  return q.and(
    q.eq(q.field("deletedAt"), undefined),
    q.eq(q.field("flaggedAt"), undefined),
    q.lte(q.field("voucherValidFrom"), now),
    q.gte(q.field("voucherValidTo"), now)
  );
}
