import { describe, it, expect } from "vitest";
import { isVoucherClaimable, formatValidityWindow } from "../lib/voucher-utils";

describe("isVoucherClaimable", () => {
  it("returns true when now is within validity window", () => {
    const from = 1000;
    const to = 3000;
    expect(isVoucherClaimable(from, to, 2000)).toBe(true);
  });

  it("returns true at exact start of window", () => {
    expect(isVoucherClaimable(1000, 3000, 1000)).toBe(true);
  });

  it("returns true at exact end of window", () => {
    expect(isVoucherClaimable(1000, 3000, 3000)).toBe(true);
  });

  it("returns false when now is before validity window", () => {
    expect(isVoucherClaimable(2000, 3000, 1000)).toBe(false);
  });

  it("returns false when now is after validity window", () => {
    expect(isVoucherClaimable(1000, 2000, 3000)).toBe(false);
  });
});

describe("formatValidityWindow", () => {
  it("returns a non-empty string", () => {
    const result = formatValidityWindow(1000000000, 2000000000);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains a separator between from and to dates", () => {
    const result = formatValidityWindow(1000000000, 2000000000);
    expect(result).toContain("–");
  });
});
