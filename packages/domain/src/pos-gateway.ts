import { Context, Data, Effect, Layer } from "effect";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PosProvider = "square" | "zettle";

export interface PosConnectionDoc {
  _id: string;
  businessId: string;
  provider: PosProvider;
  credentials: string;
  connectedAt: number;
  lastPolledAt?: number;
}

export interface RedemptionCount {
  voucherCode: string;
  count: number;
}

// ── Square transaction types ──────────────────────────────────────────────────

export interface SquareOrderDiscount {
  uid: string;
  name?: string;
  catalog_object_id?: string;
}

export interface SquareOrder {
  id: string;
  state?: string;
  discounts?: SquareOrderDiscount[];
}

// ── Zettle transaction types ──────────────────────────────────────────────────

export interface ZettleDiscount {
  code: string;
  amount: number;
}

export interface ZettlePurchase {
  purchaseUUID: string;
  discounts?: ZettleDiscount[];
  timestamp: string;
}

// ── Typed errors ──────────────────────────────────────────────────────────────

export class ProviderError extends Data.TaggedError("ProviderError")<{
  provider: PosProvider;
  message: string;
}> {}

// ── Repository interface ──────────────────────────────────────────────────────

export interface IPosConnectionRepo {
  readonly findById: (id: string) => Effect.Effect<PosConnectionDoc | null>;
  readonly findByBusiness: (
    businessId: string,
  ) => Effect.Effect<readonly PosConnectionDoc[]>;
  readonly insert: (data: Omit<PosConnectionDoc, "_id">) => Effect.Effect<string>;
  readonly remove: (id: string) => Effect.Effect<void>;
}

export class PosConnectionRepo extends Context.Tag(
  "@areacodes/domain/PosConnectionRepo",
)<PosConnectionRepo, IPosConnectionRepo>() {}

// ── Square HTTP client interface ──────────────────────────────────────────────

export interface ISquareClient {
  readonly listOrders: (
    since: number,
  ) => Effect.Effect<readonly SquareOrder[], ProviderError>;
}

export class SquareClient extends Context.Tag(
  "@areacodes/domain/SquareClient",
)<SquareClient, ISquareClient>() {}

// ── Zettle HTTP client interface ──────────────────────────────────────────────

export interface IZettleClient {
  readonly listPurchases: (
    since: number,
  ) => Effect.Effect<readonly ZettlePurchase[], ProviderError>;
}

export class ZettleClient extends Context.Tag(
  "@areacodes/domain/ZettleClient",
)<ZettleClient, IZettleClient>() {}

// ── VoucherCode format ────────────────────────────────────────────────────────
// Voucher codes are 12-char uppercase alphanumeric (generated in reveal()).

const VOUCHER_CODE_RE = /\b([A-Z0-9]{12})\b/g;

function extractVoucherCodes(text: string): readonly string[] {
  const matches = [...text.matchAll(VOUCHER_CODE_RE)];
  return [...new Set(matches.map((m) => m[1]!))];
}

// ── Square adapter ────────────────────────────────────────────────────────────

export function mapSquareOrders(
  orders: readonly SquareOrder[],
): readonly RedemptionCount[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (order.state !== "COMPLETED") continue;
    for (const discount of order.discounts ?? []) {
      const text = `${discount.name ?? ""} ${discount.catalog_object_id ?? ""}`;
      for (const code of extractVoucherCodes(text)) {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()].map(([voucherCode, count]) => ({
    voucherCode,
    count,
  }));
}

export const pollSquareRedemptions = (
  since: number,
): Effect.Effect<readonly RedemptionCount[], ProviderError, SquareClient> =>
  Effect.gen(function* () {
    const client = yield* SquareClient;
    const orders = yield* client.listOrders(since);
    return mapSquareOrders(orders);
  });

// ── Zettle adapter ────────────────────────────────────────────────────────────

export function mapZettlePurchases(
  purchases: readonly ZettlePurchase[],
): readonly RedemptionCount[] {
  const counts = new Map<string, number>();
  for (const purchase of purchases) {
    for (const discount of purchase.discounts ?? []) {
      for (const code of extractVoucherCodes(discount.code)) {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()].map(([voucherCode, count]) => ({
    voucherCode,
    count,
  }));
}

export const pollZettleRedemptions = (
  since: number,
): Effect.Effect<readonly RedemptionCount[], ProviderError, ZettleClient> =>
  Effect.gen(function* () {
    const client = yield* ZettleClient;
    const purchases = yield* client.listPurchases(since);
    return mapZettlePurchases(purchases);
  });

// ── Provider-agnostic pollRedemptions ─────────────────────────────────────────

export const pollRedemptions = (
  posConnectionId: string,
  since: number,
): Effect.Effect<
  readonly RedemptionCount[],
  ProviderError,
  PosConnectionRepo | SquareClient | ZettleClient
> =>
  Effect.gen(function* () {
    const repo = yield* PosConnectionRepo;
    const connection = yield* repo.findById(posConnectionId);
    if (!connection) return [];

    return connection.provider === "square"
      ? yield* pollSquareRedemptions(since)
      : yield* pollZettleRedemptions(since);
  });

// ── Concrete client factories (used in Convex actions via fetch) ──────────────

export function makeSquareLayer(accessToken: string): Layer.Layer<SquareClient> {
  return Layer.succeed(SquareClient, {
    listOrders: (since) =>
      Effect.tryPromise({
        try: async () => {
          const sinceISO = new Date(since).toISOString();
          const resp = await fetch(
            `https://connect.squareup.com/v2/orders/search`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "Square-Version": "2024-01-17",
              },
              body: JSON.stringify({
                query: {
                  filter: {
                    date_time_filter: {
                      created_at: { start_at: sinceISO },
                    },
                    state_filter: { states: ["COMPLETED"] },
                  },
                },
              }),
            },
          );
          if (!resp.ok) throw new Error(`Square API error: ${resp.status}`);
          const data = (await resp.json()) as { orders?: SquareOrder[] };
          return data.orders ?? [];
        },
        catch: (e) =>
          new ProviderError({ provider: "square", message: String(e) }),
      }),
  });
}

export function makeZettleLayer(apiKey: string): Layer.Layer<ZettleClient> {
  return Layer.succeed(ZettleClient, {
    listPurchases: (since) =>
      Effect.tryPromise({
        try: async () => {
          const sinceISO = new Date(since).toISOString();
          const resp = await fetch(
            `https://purchase.izettle.com/purchases/v2?startDate=${encodeURIComponent(sinceISO)}`,
            {
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          );
          if (!resp.ok) throw new Error(`Zettle API error: ${resp.status}`);
          const data = (await resp.json()) as { purchases?: ZettlePurchase[] };
          return data.purchases ?? [];
        },
        catch: (e) =>
          new ProviderError({ provider: "zettle", message: String(e) }),
      }),
  });
}
