import { describe, expect, test } from "vitest";
import { createVoucherSchema, updateVoucherSchema } from "../voucher";

const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
const yesterday = Date.now() - 24 * 60 * 60 * 1000;

const validCreateInput = {
  businessId: "business123",
  provider: "manual" as const,
  title: "10% off your next coffee",
  description: "Bring this voucher in-store to redeem",
  discount: { kind: "custom" as const, customText: "10% off" },
  voucherValidFrom: tomorrow,
  voucherValidTo: nextWeek,
};

describe("createVoucherSchema", () => {
  test("accepts valid voucher", () => {
    expect(createVoucherSchema.safeParse(validCreateInput).success).toBe(true);
  });

  test("accepts percentage discount", () => {
    const result = createVoucherSchema.safeParse({
      ...validCreateInput,
      discount: { kind: "percentage", value: 10 },
    });
    expect(result.success).toBe(true);
  });

  test("accepts fixed_amount discount", () => {
    const result = createVoucherSchema.safeParse({
      ...validCreateInput,
      discount: { kind: "fixed_amount", value: 5, currency: "GBP" },
    });
    expect(result.success).toBe(true);
  });

  test("accepts free_item discount", () => {
    const result = createVoucherSchema.safeParse({
      ...validCreateInput,
      discount: { kind: "free_item", itemName: "Coffee" },
    });
    expect(result.success).toBe(true);
  });

  test("accepts optional fields", () => {
    const result = createVoucherSchema.safeParse({
      ...validCreateInput,
      voucherTerms: "One per customer. Not valid with other offers.",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing title", () => {
    const result = createVoucherSchema.safeParse({
      ...validCreateInput,
      title: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Title is required")
      ).toBe(true);
    }
  });

  test("rejects missing description", () => {
    const result = createVoucherSchema.safeParse({
      ...validCreateInput,
      description: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Description is required")
      ).toBe(true);
    }
  });

  test("rejects invalid discount kind", () => {
    const result = createVoucherSchema.safeParse({
      ...validCreateInput,
      discount: { kind: "invalid_kind" },
    });
    expect(result.success).toBe(false);
  });

  test("rejects end date before start date", () => {
    const result = createVoucherSchema.safeParse({
      ...validCreateInput,
      voucherValidFrom: nextWeek,
      voucherValidTo: tomorrow,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "End date must be after start date"
        )
      ).toBe(true);
    }
  });

  test("rejects end date in the past", () => {
    const result = createVoucherSchema.safeParse({
      ...validCreateInput,
      voucherValidFrom: yesterday - 1000,
      voucherValidTo: yesterday,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "End date cannot be in the past"
        )
      ).toBe(true);
    }
  });

  test("accepts same start and end date", () => {
    const result = createVoucherSchema.safeParse({
      ...validCreateInput,
      voucherValidFrom: tomorrow,
      voucherValidTo: tomorrow,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateVoucherSchema", () => {
  const validUpdateInput = {
    voucherId: "voucher123",
    businessId: "business123",
    title: "10% off",
    description: "In-store only",
    discount: { kind: "custom" as const, customText: "10% off" },
    voucherValidFrom: tomorrow,
    voucherValidTo: nextWeek,
  };

  test("accepts valid update", () => {
    expect(updateVoucherSchema.safeParse(validUpdateInput).success).toBe(true);
  });

  test("requires voucherId", () => {
    const { voucherId: _, ...rest } = validUpdateInput;
    expect(updateVoucherSchema.safeParse(rest).success).toBe(false);
  });

  test("rejects end date before start date", () => {
    const result = updateVoucherSchema.safeParse({
      ...validUpdateInput,
      voucherValidFrom: nextWeek,
      voucherValidTo: tomorrow,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "End date must be after start date"
        )
      ).toBe(true);
    }
  });

  test("allows past end date (edit mode)", () => {
    // Unlike create, update does not enforce future date
    const result = updateVoucherSchema.safeParse({
      ...validUpdateInput,
      voucherValidFrom: yesterday - 1000,
      voucherValidTo: yesterday,
    });
    expect(result.success).toBe(true);
  });
});
