/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import {
  mapSquareOrderToRedemptions,
  verifySquareWebhook,
  type SquareOrder,
} from "@areacodes/domain";

// ── Credential-gated / nightly Square-sandbox round-trip (Issue #54) ──────────
//
// This is the separate, NOT-per-PR job the brief calls for: it drives a real
// Square sandbox through provision -> create order -> reconcile -> webhook
// signature. The per-PR fast layer uses recorded fixtures
// (see square-reconciliation.test.ts / squareReconciliation.test.ts); this suite
// self-skips unless sandbox credentials are present, so it only runs nightly.
//
// To run:
//   SQUARE_SANDBOX_ACCESS_TOKEN=<sandbox access token> \
//   SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY=<webhook signature key> \
//   bunx vitest run convex/__tests__/squareSandboxRoundtrip.test.ts

const ACCESS_TOKEN = process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
const WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY;
const BASE_URL =
  process.env.SQUARE_BASE_URL ?? "https://connect.squareupsandbox.com";
const SQUARE_VERSION = "2024-01-17";

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Square-Version": SQUARE_VERSION,
    "Content-Type": "application/json",
  };
}

function idem(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe.skipIf(!ACCESS_TOKEN)("Square sandbox round-trip", () => {
  // Shared state threaded across the ordered round-trip steps.
  const ctx: {
    locationId?: string;
    catalogDiscountId?: string;
    orderId?: string;
  } = {};

  test("resolves a sandbox location", async () => {
    const res = await fetch(`${BASE_URL}/v2/locations`, {
      headers: authHeaders(),
    });
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { locations?: { id?: string }[] };
    ctx.locationId = data.locations?.find((l) => l.id)?.id;
    expect(ctx.locationId).toBeTruthy();
  });

  test("provisions a catalog discount", async () => {
    const res = await fetch(`${BASE_URL}/v2/catalog/object`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        idempotency_key: idem("rt-disc"),
        object: {
          type: "DISCOUNT",
          id: "#roundtrip_discount",
          discount_data: {
            name: "Round-trip 20% off",
            discount_type: "FIXED_PERCENTAGE",
            percentage: "20.0",
          },
        },
      }),
    });
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { catalog_object?: { id?: string } };
    ctx.catalogDiscountId = data.catalog_object?.id;
    expect(ctx.catalogDiscountId).toBeTruthy();
  });

  test("creates and completes an order carrying the discount", async () => {
    expect(ctx.locationId).toBeTruthy();
    expect(ctx.catalogDiscountId).toBeTruthy();

    const createRes = await fetch(`${BASE_URL}/v2/orders`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        idempotency_key: idem("rt-order"),
        order: {
          location_id: ctx.locationId,
          line_items: [
            {
              name: "Round-trip item",
              quantity: "1",
              base_price_money: { amount: 1000, currency: "GBP" },
            },
          ],
          discounts: [
            { catalog_object_id: ctx.catalogDiscountId, scope: "ORDER" },
          ],
        },
      }),
    });
    expect(createRes.ok).toBe(true);
    const created = (await createRes.json()) as {
      order?: { id?: string; total_money?: { amount: number; currency: string } };
    };
    ctx.orderId = created.order?.id;
    expect(ctx.orderId).toBeTruthy();

    // Pay the order with the sandbox auto-approve nonce to drive it to COMPLETED.
    const payRes = await fetch(`${BASE_URL}/v2/payments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        idempotency_key: idem("rt-pay"),
        source_id: "cnon:card-nonce-ok",
        location_id: ctx.locationId,
        order_id: ctx.orderId,
        amount_money: created.order?.total_money ?? {
          amount: 800,
          currency: "GBP",
        },
        autocomplete: true,
      }),
    });
    expect(payRes.ok).toBe(true);
  });

  test("reconciles the completed order into a redemption event", async () => {
    expect(ctx.orderId).toBeTruthy();

    const res = await fetch(`${BASE_URL}/v2/orders/${ctx.orderId}`, {
      headers: authHeaders(),
    });
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { order?: SquareOrder };
    const order = data.order;
    expect(order?.state).toBe("COMPLETED");

    const events = mapSquareOrderToRedemptions(order as SquareOrder, [
      ctx.catalogDiscountId!,
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]!.orderId).toBe(ctx.orderId);
    expect(events[0]!.idempotencyKey).toBe(
      `square:${ctx.orderId}:${ctx.catalogDiscountId}`,
    );
  });

  test.skipIf(!WEBHOOK_SIGNATURE_KEY)(
    "verifies a webhook signature over notification URL + body",
    async () => {
      const url = "https://example.convex.site/square/webhook";
      const body = JSON.stringify({
        merchant_id: "SANDBOX_MERCHANT",
        type: "order.updated",
      });

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(WEBHOOK_SIGNATURE_KEY!),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const mac = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(url + body),
      );
      const signature = btoa(String.fromCharCode(...new Uint8Array(mac)));

      expect(
        await verifySquareWebhook(signature, url, body, WEBHOOK_SIGNATURE_KEY!),
      ).toBe(true);
      expect(
        await verifySquareWebhook(
          signature,
          url,
          body + " tampered",
          WEBHOOK_SIGNATURE_KEY!,
        ),
      ).toBe(false);
    },
  );
});
