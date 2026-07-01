import { describe, expect, test } from "vitest";
import {
  mapSquareOrderToRedemptions,
  verifySquareWebhook,
  type SquareOrder,
} from "../square-reconciliation.js";

// ── mapSquareOrderToRedemptions ────────────────────────────────────────────────

const OUR_CATALOG_IDS = ["DISC_ABC", "DISC_XYZ"];

function makeOrder(overrides: Partial<SquareOrder> = {}): SquareOrder {
  return {
    id: "ORDER_001",
    state: "COMPLETED",
    created_at: "2024-01-15T10:30:00.000Z",
    discounts: [
      {
        catalog_object_id: "DISC_ABC",
        applied_money: { amount: 500, currency: "GBP" },
      },
    ],
    ...overrides,
  };
}

describe("mapSquareOrderToRedemptions", () => {
  test("returns empty for a non-COMPLETED order (OPEN)", () => {
    expect(
      mapSquareOrderToRedemptions(makeOrder({ state: "OPEN" }), OUR_CATALOG_IDS),
    ).toHaveLength(0);
  });

  test("returns empty for a non-COMPLETED order (CANCELED)", () => {
    expect(
      mapSquareOrderToRedemptions(makeOrder({ state: "CANCELED" }), OUR_CATALOG_IDS),
    ).toHaveLength(0);
  });

  test("returns empty when order has no discounts array", () => {
    expect(
      mapSquareOrderToRedemptions(makeOrder({ discounts: undefined }), OUR_CATALOG_IDS),
    ).toHaveLength(0);
  });

  test("returns empty when order has an empty discounts array", () => {
    expect(
      mapSquareOrderToRedemptions(makeOrder({ discounts: [] }), OUR_CATALOG_IDS),
    ).toHaveLength(0);
  });

  test("returns empty when no discounts match our catalog IDs", () => {
    const order = makeOrder({
      discounts: [
        {
          catalog_object_id: "UNRELATED_DISC",
          applied_money: { amount: 200, currency: "GBP" },
        },
      ],
    });
    expect(mapSquareOrderToRedemptions(order, OUR_CATALOG_IDS)).toHaveLength(0);
  });

  test("returns a redemption for a matching catalog discount", () => {
    const result = mapSquareOrderToRedemptions(makeOrder(), OUR_CATALOG_IDS);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      idempotencyKey: "square:ORDER_001:DISC_ABC",
      orderId: "ORDER_001",
      catalogDiscountId: "DISC_ABC",
      amountDiscounted: 500,
    });
    expect(result[0]!.occurredAt).toBe(new Date("2024-01-15T10:30:00.000Z").getTime());
  });

  test("idempotency key is square:{orderId}:{catalogDiscountId}", () => {
    const result = mapSquareOrderToRedemptions(makeOrder(), OUR_CATALOG_IDS);
    expect(result[0]!.idempotencyKey).toBe("square:ORDER_001:DISC_ABC");
  });

  test("returns multiple events when order has multiple matching discounts", () => {
    const order = makeOrder({
      discounts: [
        { catalog_object_id: "DISC_ABC", applied_money: { amount: 500, currency: "GBP" } },
        { catalog_object_id: "DISC_XYZ", applied_money: { amount: 300, currency: "GBP" } },
      ],
    });
    const result = mapSquareOrderToRedemptions(order, OUR_CATALOG_IDS);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.catalogDiscountId)).toContain("DISC_ABC");
    expect(result.map((r) => r.catalogDiscountId)).toContain("DISC_XYZ");
  });

  test("skips discounts without a catalog_object_id", () => {
    const order = makeOrder({
      discounts: [
        { applied_money: { amount: 100, currency: "GBP" } },
        { catalog_object_id: "DISC_ABC", applied_money: { amount: 500, currency: "GBP" } },
      ],
    });
    const result = mapSquareOrderToRedemptions(order, OUR_CATALOG_IDS);
    expect(result).toHaveLength(1);
    expect(result[0]!.catalogDiscountId).toBe("DISC_ABC");
  });

  test("omits amountDiscounted when applied_money is absent", () => {
    const order = makeOrder({
      discounts: [{ catalog_object_id: "DISC_ABC" }],
    });
    const result = mapSquareOrderToRedemptions(order, OUR_CATALOG_IDS);
    expect(result).toHaveLength(1);
    expect(result[0]!.amountDiscounted).toBeUndefined();
  });

  test("each redemption carries the correct orderId", () => {
    const order = makeOrder({ id: "ORDER_SPECIFIC_999" });
    const result = mapSquareOrderToRedemptions(order, OUR_CATALOG_IDS);
    expect(result[0]!.orderId).toBe("ORDER_SPECIFIC_999");
  });

  // Recorded fixture: a real Square COMPLETED order shape
  test("recorded fixture — COMPLETED order with one matching discount", () => {
    const fixtureOrder: SquareOrder = {
      id: "SQ_ORDER_fixture_01",
      state: "COMPLETED",
      created_at: "2024-06-01T14:22:00.000Z",
      discounts: [
        {
          catalog_object_id: "AREACODES_CAT_ID_001",
          applied_money: { amount: 1000, currency: "GBP" },
        },
        {
          catalog_object_id: "OTHER_MERCHANT_DISC",
          applied_money: { amount: 50, currency: "GBP" },
        },
      ],
    };

    const result = mapSquareOrderToRedemptions(fixtureOrder, ["AREACODES_CAT_ID_001"]);

    expect(result).toHaveLength(1);
    expect(result[0]!.idempotencyKey).toBe(
      "square:SQ_ORDER_fixture_01:AREACODES_CAT_ID_001",
    );
    expect(result[0]!.amountDiscounted).toBe(1000);
  });
});

// ── verifySquareWebhook ────────────────────────────────────────────────────────

const WEBHOOK_URL = "https://example.convex.site/square/webhook";
const SECRET = "test-webhook-secret-key";
const BODY = JSON.stringify({ merchant_id: "MERCHANT_1", type: "order.updated" });

async function computeExpectedSignature(
  url: string,
  body: string,
  secret: string,
): Promise<string> {
  const payload = url + body;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

describe("verifySquareWebhook", () => {
  test("returns true for a valid signature", async () => {
    const sig = await computeExpectedSignature(WEBHOOK_URL, BODY, SECRET);
    expect(await verifySquareWebhook(sig, WEBHOOK_URL, BODY, SECRET)).toBe(true);
  });

  test("returns false for a tampered body", async () => {
    const sig = await computeExpectedSignature(WEBHOOK_URL, BODY, SECRET);
    expect(await verifySquareWebhook(sig, WEBHOOK_URL, BODY + " tampered", SECRET)).toBe(false);
  });

  test("returns false for a wrong secret", async () => {
    const sig = await computeExpectedSignature(WEBHOOK_URL, BODY, SECRET);
    expect(await verifySquareWebhook(sig, WEBHOOK_URL, BODY, "wrong-secret")).toBe(false);
  });

  test("returns false for an empty signature header", async () => {
    expect(await verifySquareWebhook("", WEBHOOK_URL, BODY, SECRET)).toBe(false);
  });

  test("returns false for the wrong webhook URL", async () => {
    const sig = await computeExpectedSignature(WEBHOOK_URL, BODY, SECRET);
    expect(await verifySquareWebhook(sig, "https://attacker.example.com/webhook", BODY, SECRET)).toBe(false);
  });

  test("returns false for a tampered signature (single char changed)", async () => {
    const sig = await computeExpectedSignature(WEBHOOK_URL, BODY, SECRET);
    const tampered = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(await verifySquareWebhook(tampered, WEBHOOK_URL, BODY, SECRET)).toBe(false);
  });
});
