import { describe, expect, test } from "vitest";
import {
  getCapabilities,
  supportsKind,
  deriveManualIdempotencyKey,
  deriveSquareIdempotencyKey,
  deriveRedemptionUrl,
  validateManualBurn,
  type DiscountKind,
} from "../provider-capabilities.js";

// ── Capability routing ─────────────────────────────────────────────────────────

describe("getCapabilities — square", () => {
  test("provisionableKinds: percentage and fixed_amount only", () => {
    const caps = getCapabilities("square");
    expect(caps.provisionableKinds).toContain("percentage");
    expect(caps.provisionableKinds).toContain("fixed_amount");
    expect(caps.provisionableKinds).not.toContain("free_item");
    expect(caps.provisionableKinds).not.toContain("bogof");
    expect(caps.provisionableKinds).not.toContain("custom");
  });

  test("no customer attribution", () => {
    expect(getCapabilities("square").attributesToCustomer).toBe(false);
  });

  test("presentation: audit_code_only", () => {
    expect(getCapabilities("square").presentation).toBe("audit_code_only");
  });

  test("reconciliation: webhook_poll", () => {
    expect(getCapabilities("square").reconciliation).toBe("webhook_poll");
  });
});

describe("getCapabilities — manual", () => {
  test("provisionableKinds: all five kinds", () => {
    const caps = getCapabilities("manual");
    const expectedKinds: DiscountKind[] = [
      "percentage",
      "fixed_amount",
      "free_item",
      "bogof",
      "custom",
    ];
    for (const kind of expectedKinds) {
      expect(caps.provisionableKinds).toContain(kind);
    }
    expect(caps.provisionableKinds).toHaveLength(5);
  });

  test("attributes to customer", () => {
    expect(getCapabilities("manual").attributesToCustomer).toBe(true);
  });

  test("presentation: redemption_url", () => {
    expect(getCapabilities("manual").presentation).toBe("redemption_url");
  });

  test("reconciliation: first_party_burn", () => {
    expect(getCapabilities("manual").reconciliation).toBe("first_party_burn");
  });
});

describe("supportsKind", () => {
  test("square supports percentage", () => {
    expect(supportsKind("square", "percentage")).toBe(true);
  });

  test("square supports fixed_amount", () => {
    expect(supportsKind("square", "fixed_amount")).toBe(true);
  });

  test("square does not support free_item", () => {
    expect(supportsKind("square", "free_item")).toBe(false);
  });

  test("square does not support bogof", () => {
    expect(supportsKind("square", "bogof")).toBe(false);
  });

  test("square does not support custom", () => {
    expect(supportsKind("square", "custom")).toBe(false);
  });

  test("manual supports all five kinds", () => {
    const kinds: DiscountKind[] = ["percentage", "fixed_amount", "free_item", "bogof", "custom"];
    for (const kind of kinds) {
      expect(supportsKind("manual", kind)).toBe(true);
    }
  });
});

// ── Idempotency-key derivation ────────────────────────────────────────────────

describe("deriveManualIdempotencyKey", () => {
  test("returns manual:{claimId}", () => {
    expect(deriveManualIdempotencyKey("claim-abc123")).toBe("manual:claim-abc123");
  });

  test("different claimIds produce different keys", () => {
    const k1 = deriveManualIdempotencyKey("claim-1");
    const k2 = deriveManualIdempotencyKey("claim-2");
    expect(k1).not.toBe(k2);
  });
});

describe("deriveSquareIdempotencyKey", () => {
  test("returns square:{orderId}:{catalogDiscountId}", () => {
    expect(deriveSquareIdempotencyKey("order-xyz", "discount-abc")).toBe(
      "square:order-xyz:discount-abc",
    );
  });

  test("different orderId produces different keys", () => {
    const k1 = deriveSquareIdempotencyKey("order-1", "discount-x");
    const k2 = deriveSquareIdempotencyKey("order-2", "discount-x");
    expect(k1).not.toBe(k2);
  });

  test("different catalogDiscountId produces different keys", () => {
    const k1 = deriveSquareIdempotencyKey("order-x", "discount-1");
    const k2 = deriveSquareIdempotencyKey("order-x", "discount-2");
    expect(k1).not.toBe(k2);
  });
});

// ── Burn-validation predicate ─────────────────────────────────────────────────

const NOW = 1_700_000_000_000;

function makeVoucher(overrides: Partial<Parameters<typeof validateManualBurn>[0]["voucher"]> = {}): Parameters<typeof validateManualBurn>[0]["voucher"] {
  return {
    deletedAt: undefined,
    flaggedAt: undefined,
    voucherValidFrom: NOW - 10_000,
    voucherValidTo: NOW + 10_000,
    businessId: "biz-1",
    provider: "manual" as const,
    provisioning: { status: "not_required" },
    ...overrides,
  };
}

describe("deriveRedemptionUrl", () => {
  test("encodes voucherId and claimId into the URL", () => {
    const url = deriveRedemptionUrl(
      "https://business.example.com",
      "voucher-abc",
      "claim-xyz",
    );
    expect(url).toBe(
      "https://business.example.com/redeem?v=voucher-abc&c=claim-xyz",
    );
  });

  test("URL-encodes IDs with special characters", () => {
    const url = deriveRedemptionUrl(
      "https://business.example.com",
      "voucher/abc",
      "claim&xyz",
    );
    expect(url).toContain("voucher%2Fabc");
    expect(url).toContain("claim%26xyz");
  });

  test("uses the base URL as provided", () => {
    const url = deriveRedemptionUrl(
      "http://localhost:3000",
      "v-1",
      "c-1",
    );
    expect(url.startsWith("http://localhost:3000/redeem")).toBe(true);
  });
});

describe("validateManualBurn", () => {
  test("accepts a valid burn", () => {
    const result = validateManualBurn({
      voucher: makeVoucher(),
      claimId: "claim-1",
      businessId: "biz-1",
      now: NOW,
      alreadyBurned: false,
    });
    expect(result.valid).toBe(true);
  });

  test("rejects deleted voucher", () => {
    const result = validateManualBurn({
      voucher: makeVoucher({ deletedAt: NOW - 1000 }),
      claimId: "claim-1",
      businessId: "biz-1",
      now: NOW,
      alreadyBurned: false,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("deleted");
  });

  test("rejects flagged voucher", () => {
    const result = validateManualBurn({
      voucher: makeVoucher({ flaggedAt: NOW - 1000 }),
      claimId: "claim-1",
      businessId: "biz-1",
      now: NOW,
      alreadyBurned: false,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("flagged");
  });

  test("rejects expired voucher (validTo < now)", () => {
    const result = validateManualBurn({
      voucher: makeVoucher({ voucherValidTo: NOW - 1 }),
      claimId: "claim-1",
      businessId: "biz-1",
      now: NOW,
      alreadyBurned: false,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("expired");
  });

  test("rejects out-of-window voucher (validFrom > now)", () => {
    const result = validateManualBurn({
      voucher: makeVoucher({ voucherValidFrom: NOW + 1 }),
      claimId: "claim-1",
      businessId: "biz-1",
      now: NOW,
      alreadyBurned: false,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("not_in_window");
  });

  test("rejects already-burned claim", () => {
    const result = validateManualBurn({
      voucher: makeVoucher(),
      claimId: "claim-1",
      businessId: "biz-1",
      now: NOW,
      alreadyBurned: true,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("already_burned");
  });

  test("rejects wrong business", () => {
    const result = validateManualBurn({
      voucher: makeVoucher({ businessId: "biz-99" }),
      claimId: "claim-1",
      businessId: "biz-1",
      now: NOW,
      alreadyBurned: false,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("wrong_business");
  });

  test("precedence: deleted checked before expired", () => {
    const result = validateManualBurn({
      voucher: makeVoucher({ deletedAt: NOW - 1, voucherValidTo: NOW - 1 }),
      claimId: "claim-1",
      businessId: "biz-1",
      now: NOW,
      alreadyBurned: false,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("deleted");
  });
});
