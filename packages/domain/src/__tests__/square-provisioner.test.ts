import { describe, expect, test } from "vitest";
import {
  mapDiscountToCatalogObject,
  type SquareCatalogDiscountRequest,
} from "../square-provisioner.js";

// ── mapDiscountToCatalogObject — pure shaping ─────────────────────────────────

describe("mapDiscountToCatalogObject — percentage", () => {
  test("produces FIXED_PERCENTAGE type with string percentage", () => {
    const req: SquareCatalogDiscountRequest = mapDiscountToCatalogObject(
      "Summer Sale",
      { kind: "percentage", value: 20, currency: "GBP" },
    );

    expect(req.object.discount_data.discount_type).toBe("FIXED_PERCENTAGE");
    expect(req.object.discount_data.percentage).toBe("20");
    expect(req.object.discount_data.amount_money).toBeUndefined();
  });

  test("names the discount 'Areacodes: {title}'", () => {
    const req = mapDiscountToCatalogObject("10% Tuesday", { kind: "percentage", value: 10 });
    expect(req.object.discount_data.name).toBe("Areacodes: 10% Tuesday");
  });

  test("sets pin_required false and present_at_all_locations true", () => {
    const req = mapDiscountToCatalogObject("Test", { kind: "percentage", value: 5 });
    expect(req.object.discount_data.pin_required).toBe(false);
    expect(req.object.present_at_all_locations).toBe(true);
  });

  test("id is #discount (temp id for Square Upsert API)", () => {
    const req = mapDiscountToCatalogObject("Test", { kind: "percentage", value: 5 });
    expect(req.object.id).toBe("#discount");
  });

  test("object type is DISCOUNT", () => {
    const req = mapDiscountToCatalogObject("Test", { kind: "percentage", value: 5 });
    expect(req.object.type).toBe("DISCOUNT");
  });

  test("percentage value is stringified integer", () => {
    const req = mapDiscountToCatalogObject("Sale", { kind: "percentage", value: 15 });
    expect(req.object.discount_data.percentage).toBe("15");
    expect(typeof req.object.discount_data.percentage).toBe("string");
  });
});

describe("mapDiscountToCatalogObject — fixed_amount", () => {
  test("produces FIXED_AMOUNT type with amount_money", () => {
    const req = mapDiscountToCatalogObject("£5 off", {
      kind: "fixed_amount",
      value: 500,
      currency: "GBP",
    });

    expect(req.object.discount_data.discount_type).toBe("FIXED_AMOUNT");
    expect(req.object.discount_data.amount_money).toEqual({
      amount: 500,
      currency: "GBP",
    });
    expect(req.object.discount_data.percentage).toBeUndefined();
  });

  test("defaults currency to GBP if not provided", () => {
    const req = mapDiscountToCatalogObject("£5 off", {
      kind: "fixed_amount",
      value: 500,
    });
    expect(req.object.discount_data.amount_money?.currency).toBe("GBP");
  });

  test("passes minor-unit amount unchanged", () => {
    const req = mapDiscountToCatalogObject("£10 off", {
      kind: "fixed_amount",
      value: 1000,
      currency: "GBP",
    });
    expect(req.object.discount_data.amount_money?.amount).toBe(1000);
  });

  test("names the discount 'Areacodes: {title}'", () => {
    const req = mapDiscountToCatalogObject("Loyalty Discount", {
      kind: "fixed_amount",
      value: 250,
    });
    expect(req.object.discount_data.name).toBe("Areacodes: Loyalty Discount");
  });
});

// ── ProvisionError / AuthError / RateLimited typed errors ─────────────────────

describe("typed errors", () => {
  test("ProvisionError has _tag ProvisionError", async () => {
    const { ProvisionError } = await import("../square-provisioner.js");
    const err = new ProvisionError({ message: "something failed" });
    expect(err._tag).toBe("ProvisionError");
    expect(err.message).toBe("something failed");
  });

  test("AuthError has _tag AuthError", async () => {
    const { AuthError } = await import("../square-provisioner.js");
    const err = new AuthError({ message: "token expired" });
    expect(err._tag).toBe("AuthError");
  });

  test("RateLimited has _tag RateLimited", async () => {
    const { RateLimited } = await import("../square-provisioner.js");
    const err = new RateLimited({ message: "429 too many requests" });
    expect(err._tag).toBe("RateLimited");
  });
});
