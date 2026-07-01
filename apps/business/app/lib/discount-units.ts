import type { Discount } from "@areacodes/domain";

// The UI edits fixed_amount discounts in major units (e.g. £5.00) while the
// domain stores minor units (e.g. 500). These helpers convert across that
// boundary and leave other discount kinds untouched.

export function toMinorUnits(discount: Discount): Discount {
  if (discount.kind === "fixed_amount" && discount.value != null) {
    return {
      ...discount,
      value: Math.round(discount.value * 100),
      currency: discount.currency ?? "GBP",
    };
  }
  return discount;
}

export function toMajorUnits(discount: Discount): Discount {
  if (discount.kind === "fixed_amount" && discount.value != null) {
    return { ...discount, value: discount.value / 100 };
  }
  return discount;
}
