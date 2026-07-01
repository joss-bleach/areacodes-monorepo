import { Context, Data } from "effect";
import type { Discount } from "./voucher-service.js";

// ── Typed errors ───────────────────────────────────────────────────────────────

export class ProvisionError extends Data.TaggedError("ProvisionError")<{
  message: string;
}> {}

export class AuthError extends Data.TaggedError("AuthError")<{
  message: string;
}> {}

export class RateLimited extends Data.TaggedError("RateLimited")<{
  message: string;
}> {}

// ── Square Catalog API request shape ──────────────────────────────────────────

export interface SquareCatalogDiscountData {
  name: string;
  discount_type: "FIXED_PERCENTAGE" | "FIXED_AMOUNT";
  percentage?: string;
  amount_money?: { amount: number; currency: string };
  pin_required: false;
}

export interface SquareCatalogObject {
  type: "DISCOUNT";
  id: string;
  present_at_all_locations: boolean;
  discount_data: SquareCatalogDiscountData;
}

export interface SquareCatalogDiscountRequest {
  idempotency_key: string;
  object: SquareCatalogObject;
}

// ── Pure discount → CatalogDiscount request shaping ──────────────────────────

export function mapDiscountToCatalogObject(
  title: string,
  discount: Pick<Discount, "kind" | "value" | "currency">,
): SquareCatalogDiscountRequest {
  const name = `Areacodes: ${title}`;

  let discountData: SquareCatalogDiscountData;

  if (discount.kind === "percentage") {
    discountData = {
      name,
      discount_type: "FIXED_PERCENTAGE",
      percentage: String(discount.value ?? 0),
      pin_required: false,
    };
  } else {
    discountData = {
      name,
      discount_type: "FIXED_AMOUNT",
      amount_money: {
        amount: discount.value ?? 0,
        currency: discount.currency ?? "GBP",
      },
      pin_required: false,
    };
  }

  return {
    idempotency_key: `areacodes-${title.toLowerCase().replace(/\s+/g, "-")}-${discount.kind}`,
    object: {
      type: "DISCOUNT",
      id: "#discount",
      present_at_all_locations: true,
      discount_data: discountData,
    },
  };
}

// ── SquareProvisioner service interface ───────────────────────────────────────

export interface ISquareProvisioner {
  readonly createCatalogDiscount: (
    accessToken: string,
    voucherId: string,
    title: string,
    discount: Pick<Discount, "kind" | "value" | "currency">,
  ) => Promise<{ catalogObjectId: string }>;

  readonly deleteCatalogDiscount: (
    accessToken: string,
    catalogObjectId: string,
  ) => Promise<void>;
}

export class SquareProvisioner extends Context.Tag(
  "@areacodes/domain/SquareProvisioner",
)<SquareProvisioner, ISquareProvisioner>() {}
