import type { Discount } from "./voucher-service.js";

export interface VoucherCopy {
  title: string;
  description: string;
}

export function deriveVoucherCopy(discount: Discount): VoucherCopy {
  switch (discount.kind) {
    case "percentage": {
      const pct = discount.value ?? 0;
      return {
        title: `${pct}% off`,
        description: `Get ${pct}% off your purchase`,
      };
    }
    case "fixed_amount": {
      const pence = discount.value ?? 0;
      const currency = discount.currency ?? "GBP";
      const formatted = formatMinorUnits(pence, currency);
      return {
        title: `${formatted} off`,
        description: `Save ${formatted} on your purchase`,
      };
    }
    case "free_item": {
      const item = discount.itemName ?? "item";
      return {
        title: `Free ${item}`,
        description: `Get a free ${item} with your purchase`,
      };
    }
    case "bogof":
      return {
        title: "Buy one, get one free",
        description: "Buy one, get one free",
      };
    case "custom": {
      const text = discount.customText ?? "";
      return { title: text, description: text };
    }
  }
}

function formatMinorUnits(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minorUnits / 100);
}
