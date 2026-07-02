import { describe, expect, test } from "vitest";
import { voucherStatus } from "../voucher-presentation.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

describe("voucherStatus", () => {
  test("returns 'active' when now is between validFrom and validTo with more than 3 days remaining", () => {
    const result = voucherStatus(
      { voucherValidFrom: NOW - 10 * DAY, voucherValidTo: NOW + 60 * DAY },
      NOW
    );
    expect(result).toBe("active");
  });

  test("returns 'expiring' when validTo is within 3 days", () => {
    const result = voucherStatus(
      { voucherValidFrom: NOW - 10 * DAY, voucherValidTo: NOW + 2 * DAY },
      NOW
    );
    expect(result).toBe("expiring");
  });

  test("returns 'expiring' when validTo is exactly 3 days away", () => {
    const result = voucherStatus(
      { voucherValidFrom: NOW - 10 * DAY, voucherValidTo: NOW + 3 * DAY },
      NOW
    );
    expect(result).toBe("expiring");
  });

  test("returns 'active' when validTo is more than 3 days away", () => {
    const result = voucherStatus(
      { voucherValidFrom: NOW - 10 * DAY, voucherValidTo: NOW + 3 * DAY + 1 },
      NOW
    );
    expect(result).toBe("active");
  });

  test("returns 'expired' when validTo is before now", () => {
    const result = voucherStatus(
      { voucherValidFrom: NOW - 60 * DAY, voucherValidTo: NOW - 1 * DAY },
      NOW
    );
    expect(result).toBe("expired");
  });

  test("returns 'scheduled' when validFrom is after now", () => {
    const result = voucherStatus(
      { voucherValidFrom: NOW + 10 * DAY, voucherValidTo: NOW + 60 * DAY },
      NOW
    );
    expect(result).toBe("scheduled");
  });

  test("returns 'active' when validFrom equals now", () => {
    const result = voucherStatus(
      { voucherValidFrom: NOW, voucherValidTo: NOW + 60 * DAY },
      NOW
    );
    expect(result).toBe("active");
  });

  test("returns 'expiring' when validTo equals now", () => {
    const result = voucherStatus(
      { voucherValidFrom: NOW - 10 * DAY, voucherValidTo: NOW },
      NOW
    );
    expect(result).toBe("expiring");
  });
});
