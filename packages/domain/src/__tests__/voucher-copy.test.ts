import { describe, expect, test } from "vitest";
import { deriveVoucherCopy } from "../voucher-copy.js";

describe("deriveVoucherCopy — percentage", () => {
  test("derives title as N% off", () => {
    const copy = deriveVoucherCopy({ kind: "percentage", value: 20 });
    expect(copy.title).toBe("20% off");
  });

  test("derives description", () => {
    const copy = deriveVoucherCopy({ kind: "percentage", value: 15 });
    expect(copy.description).toBe("Get 15% off your purchase");
  });

  test("handles 0 value gracefully", () => {
    const copy = deriveVoucherCopy({ kind: "percentage", value: 0 });
    expect(copy.title).toBe("0% off");
  });
});

describe("deriveVoucherCopy — fixed_amount", () => {
  test("formats minor units in GBP (500 = £5.00)", () => {
    const copy = deriveVoucherCopy({ kind: "fixed_amount", value: 500, currency: "GBP" });
    expect(copy.title).toBe("£5.00 off");
    expect(copy.description).toBe("Save £5.00 on your purchase");
  });

  test("formats larger amount (2000 = £20.00)", () => {
    const copy = deriveVoucherCopy({ kind: "fixed_amount", value: 2000, currency: "GBP" });
    expect(copy.title).toBe("£20.00 off");
  });

  test("defaults to GBP when currency omitted", () => {
    const copy = deriveVoucherCopy({ kind: "fixed_amount", value: 100 });
    expect(copy.title).toContain("£");
    expect(copy.title).toContain("off");
  });
});

describe("deriveVoucherCopy — free_item", () => {
  test("derives title as Free <item>", () => {
    const copy = deriveVoucherCopy({ kind: "free_item", itemName: "flat white" });
    expect(copy.title).toBe("Free flat white");
  });

  test("derives description", () => {
    const copy = deriveVoucherCopy({ kind: "free_item", itemName: "coffee" });
    expect(copy.description).toBe("Get a free coffee with your purchase");
  });

  test("falls back to generic when itemName omitted", () => {
    const copy = deriveVoucherCopy({ kind: "free_item" });
    expect(copy.title).toBe("Free item");
  });
});

describe("deriveVoucherCopy — bogof", () => {
  test("fixed copy for title", () => {
    const copy = deriveVoucherCopy({ kind: "bogof" });
    expect(copy.title).toBe("Buy one, get one free");
  });

  test("fixed copy for description", () => {
    const copy = deriveVoucherCopy({ kind: "bogof" });
    expect(copy.description).toBe("Buy one, get one free");
  });
});

describe("deriveVoucherCopy — custom", () => {
  test("uses customText for both title and description", () => {
    const copy = deriveVoucherCopy({ kind: "custom", customText: "Staff discount" });
    expect(copy.title).toBe("Staff discount");
    expect(copy.description).toBe("Staff discount");
  });

  test("falls back to empty string when customText omitted", () => {
    const copy = deriveVoucherCopy({ kind: "custom" });
    expect(copy.title).toBe("");
    expect(copy.description).toBe("");
  });
});
