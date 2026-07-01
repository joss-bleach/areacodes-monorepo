// ── Square Order types ─────────────────────────────────────────────────────────

export interface SquareOrderDiscount {
  catalog_object_id?: string;
  applied_money?: { amount: number; currency: string };
}

export interface SquareOrder {
  id: string;
  state: string;
  created_at?: string;
  discounts?: SquareOrderDiscount[];
}

// ── Redemption shape produced from a Square order ─────────────────────────────

export interface SquareOrderRedemption {
  idempotencyKey: string;
  orderId: string;
  catalogDiscountId: string;
  amountDiscounted?: number;
  occurredAt: number;
}

// ── Pure: map completed order discounts to redemption event shapes ─────────────
// Returns one event per matching catalog discount.
// Non-COMPLETED orders or orders with no matching catalog IDs return [].
// Extract-and-discard: raw payload is not retained; caller must not store it.

export function mapSquareOrderToRedemptions(
  order: SquareOrder,
  ourCatalogIds: readonly string[],
): SquareOrderRedemption[] {
  if (order.state !== "COMPLETED") return [];

  const occurredAt = order.created_at
    ? new Date(order.created_at).getTime()
    : Date.now();

  const results: SquareOrderRedemption[] = [];

  for (const discount of order.discounts ?? []) {
    const catalogId = discount.catalog_object_id;
    if (!catalogId) continue;
    if (!ourCatalogIds.includes(catalogId)) continue;

    results.push({
      idempotencyKey: `square:${order.id}:${catalogId}`,
      orderId: order.id,
      catalogDiscountId: catalogId,
      amountDiscounted: discount.applied_money?.amount,
      occurredAt,
    });
  }

  return results;
}

// ── Pure: verify Square webhook HMAC-SHA-256 signature ────────────────────────
// Square signature = base64(HMAC-SHA-256(webhookNotificationUrl + rawBody, secret))
// Prior art: the Stripe crypto.subtle verify in convex/http.ts.

export async function verifySquareWebhook(
  signatureHeader: string,
  webhookUrl: string,
  rawBody: string,
  webhookSecret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const payload = webhookUrl + rawBody;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  return expected === signatureHeader;
}
