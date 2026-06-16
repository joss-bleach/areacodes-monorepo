import { describe, it, expect } from "vitest";
import { getWalletStateLabel, formatCodeExpiry } from "../lib/wallet-utils";

describe("getWalletStateLabel", () => {
  it("returns 'Claimed' for claimed state", () => {
    expect(getWalletStateLabel("claimed")).toBe("Claimed");
  });

  it("returns 'Active' for revealed state", () => {
    expect(getWalletStateLabel("revealed")).toBe("Active");
  });

  it("returns 'Expired' for expired state", () => {
    expect(getWalletStateLabel("expired")).toBe("Expired");
  });

  it("returns 'Suspended' for suspended state", () => {
    expect(getWalletStateLabel("suspended")).toBe("Suspended");
  });
});

describe("formatCodeExpiry", () => {
  it("returns 'Expired' when expiresAt is in the past", () => {
    expect(formatCodeExpiry(1000, 2000)).toBe("Expired");
  });

  it("returns 'Expired' when expiresAt equals now", () => {
    expect(formatCodeExpiry(1000, 1000)).toBe("Expired");
  });

  it("shows minutes remaining when under one hour", () => {
    const now = 0;
    const expiresAt = 30 * 60 * 1000;
    expect(formatCodeExpiry(expiresAt, now)).toBe("30m remaining");
  });

  it("shows hours and minutes when over one hour remaining", () => {
    const now = 0;
    const expiresAt = 90 * 60 * 1000;
    expect(formatCodeExpiry(expiresAt, now)).toBe("1h 30m remaining");
  });

  it("shows 2h 0m for exactly two hours", () => {
    const now = 0;
    const expiresAt = 2 * 60 * 60 * 1000;
    expect(formatCodeExpiry(expiresAt, now)).toBe("2h 0m remaining");
  });

  it("shows 0m remaining for under one minute", () => {
    const now = 0;
    const expiresAt = 30_000;
    expect(formatCodeExpiry(expiresAt, now)).toBe("0m remaining");
  });
});
