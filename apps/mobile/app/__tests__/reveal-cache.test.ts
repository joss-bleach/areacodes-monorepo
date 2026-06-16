import { describe, it, expect } from "vitest";
import { isRevealValid, filterValidReveals } from "../lib/reveal-cache";

describe("isRevealValid", () => {
  it("returns false when code is expired", () => {
    expect(isRevealValid(1000, 2000)).toBe(false);
  });

  it("returns false at exact expiry moment", () => {
    expect(isRevealValid(1000, 1000)).toBe(false);
  });

  it("returns true when code has time remaining", () => {
    expect(isRevealValid(2000, 1000)).toBe(true);
  });
});

describe("filterValidReveals", () => {
  it("returns empty array for empty input", () => {
    expect(filterValidReveals([], 1000)).toEqual([]);
  });

  it("filters out expired entries", () => {
    const reveals = [
      { claimId: "a", voucherCode: "ABC123ABC123", expiresAt: 500 },
      { claimId: "b", voucherCode: "DEF456DEF456", expiresAt: 2000 },
    ];
    expect(filterValidReveals(reveals, 1000)).toEqual([
      { claimId: "b", voucherCode: "DEF456DEF456", expiresAt: 2000 },
    ]);
  });

  it("returns all entries when none are expired", () => {
    const reveals = [
      { claimId: "a", voucherCode: "ABC123ABC123", expiresAt: 2000 },
      { claimId: "b", voucherCode: "DEF456DEF456", expiresAt: 3000 },
    ];
    expect(filterValidReveals(reveals, 1000)).toEqual(reveals);
  });

  it("returns empty array when all entries are expired", () => {
    const reveals = [
      { claimId: "a", voucherCode: "ABC123ABC123", expiresAt: 100 },
    ];
    expect(filterValidReveals(reveals, 1000)).toEqual([]);
  });

  it("excludes entries that expire exactly at now", () => {
    const reveals = [
      { claimId: "a", voucherCode: "ABC123ABC123", expiresAt: 1000 },
    ];
    expect(filterValidReveals(reveals, 1000)).toEqual([]);
  });

  it("preserves optional fields when filtering", () => {
    const reveals = [
      {
        claimId: "a",
        voucherCode: "ABC123ABC123",
        expiresAt: 2000,
        voucherTitle: "10% Off",
        businessName: "Test Cafe",
      },
    ];
    expect(filterValidReveals(reveals, 1000)).toEqual(reveals);
  });
});
