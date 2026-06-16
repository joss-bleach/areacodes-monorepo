import { Effect, Layer } from "effect";
import { describe, expect, test } from "vitest";
import {
  SquareClient,
  ZettleClient,
  PosConnectionRepo,
  ProviderError,
  mapSquareOrders,
  mapZettlePurchases,
  pollSquareRedemptions,
  pollZettleRedemptions,
  pollRedemptions,
  type ISquareClient,
  type IZettleClient,
  type IPosConnectionRepo,
  type SquareOrder,
  type ZettlePurchase,
  type PosConnectionDoc,
} from "../pos-gateway.js";

// ── Fixture data ──────────────────────────────────────────────────────────────

const SQUARE_ORDERS_FIXTURE: SquareOrder[] = [
  {
    id: "order-1",
    state: "COMPLETED",
    discounts: [{ uid: "d1", name: "A1B2C3D4E5F6" }],
  },
  {
    id: "order-2",
    state: "COMPLETED",
    discounts: [{ uid: "d2", name: "A1B2C3D4E5F6" }], // same code, count=2
  },
  {
    id: "order-3",
    state: "COMPLETED",
    discounts: [{ uid: "d3", name: "X9Y8Z7W6V5U4" }],
  },
  {
    id: "order-4",
    state: "CANCELED", // not completed — should be ignored
    discounts: [{ uid: "d4", name: "IGNORETHISCODE" }],
  },
  {
    id: "order-5",
    state: "COMPLETED",
    discounts: [{ uid: "d5", name: "not-a-valid-code" }], // wrong format
  },
];

const ZETTLE_PURCHASES_FIXTURE: ZettlePurchase[] = [
  {
    purchaseUUID: "p1",
    discounts: [{ code: "A1B2C3D4E5F6", amount: 500 }],
    timestamp: "2024-01-01T10:00:00Z",
  },
  {
    purchaseUUID: "p2",
    discounts: [{ code: "X9Y8Z7W6V5U4", amount: 1000 }],
    timestamp: "2024-01-01T11:00:00Z",
  },
  {
    purchaseUUID: "p3",
    discounts: [{ code: "A1B2C3D4E5F6", amount: 500 }], // same as p1
    timestamp: "2024-01-01T12:00:00Z",
  },
  {
    purchaseUUID: "p4",
    // No discounts — should produce no counts
    timestamp: "2024-01-01T13:00:00Z",
  },
];

// ── Helper factories ──────────────────────────────────────────────────────────

function makeFixtureSquareClient(orders: SquareOrder[]): ISquareClient {
  return {
    listOrders: () => Effect.succeed(orders),
  };
}

function makeFixtureZettleClient(purchases: ZettlePurchase[]): IZettleClient {
  return {
    listPurchases: () => Effect.succeed(purchases),
  };
}

function makeFixturePosRepo(connections: PosConnectionDoc[]): IPosConnectionRepo {
  return {
    findById: (id) =>
      Effect.succeed(connections.find((c) => c._id === id) ?? null),
    findByBusiness: (businessId) =>
      Effect.succeed(connections.filter((c) => c.businessId === businessId)),
    insert: (data) => {
      const doc: PosConnectionDoc = { ...data, _id: `conn-${Date.now()}` };
      connections.push(doc);
      return Effect.succeed(doc._id);
    },
    remove: (id) => {
      const idx = connections.findIndex((c) => c._id === id);
      if (idx !== -1) connections.splice(idx, 1);
      return Effect.void;
    },
  };
}

// ── mapSquareOrders (pure function tests) ─────────────────────────────────────

describe("mapSquareOrders", () => {
  test("maps COMPLETED orders with voucher codes to RedemptionCount[]", () => {
    const result = mapSquareOrders(SQUARE_ORDERS_FIXTURE);

    const a1b2 = result.find((r) => r.voucherCode === "A1B2C3D4E5F6");
    const x9y8 = result.find((r) => r.voucherCode === "X9Y8Z7W6V5U4");

    expect(a1b2?.count).toBe(2);
    expect(x9y8?.count).toBe(1);
  });

  test("ignores non-COMPLETED orders", () => {
    const result = mapSquareOrders(SQUARE_ORDERS_FIXTURE);
    expect(result.find((r) => r.voucherCode === "IGNORETHISCODE")).toBeUndefined();
  });

  test("ignores discount names that do not match the 12-char format", () => {
    const result = mapSquareOrders(SQUARE_ORDERS_FIXTURE);
    expect(result.find((r) => r.voucherCode === "not-a-valid-code")).toBeUndefined();
  });

  test("returns empty array when no orders match", () => {
    const result = mapSquareOrders([]);
    expect(result).toHaveLength(0);
  });

  test("reads voucher code from catalog_object_id when name is absent", () => {
    const orders: SquareOrder[] = [
      {
        id: "order-x",
        state: "COMPLETED",
        discounts: [{ uid: "d-x", catalog_object_id: "P9Q8R7S6T5U4" }],
      },
    ];
    const result = mapSquareOrders(orders);
    expect(result[0]?.voucherCode).toBe("P9Q8R7S6T5U4");
    expect(result[0]?.count).toBe(1);
  });
});

// ── mapZettlePurchases (pure function tests) ──────────────────────────────────

describe("mapZettlePurchases", () => {
  test("maps purchases with discount codes to RedemptionCount[]", () => {
    const result = mapZettlePurchases(ZETTLE_PURCHASES_FIXTURE);

    const a1b2 = result.find((r) => r.voucherCode === "A1B2C3D4E5F6");
    const x9y8 = result.find((r) => r.voucherCode === "X9Y8Z7W6V5U4");

    expect(a1b2?.count).toBe(2);
    expect(x9y8?.count).toBe(1);
  });

  test("ignores purchases with no discounts", () => {
    const result = mapZettlePurchases(ZETTLE_PURCHASES_FIXTURE);
    expect(result).toHaveLength(2); // only A1B2 and X9Y8
  });

  test("returns empty array when no purchases have matching codes", () => {
    const result = mapZettlePurchases([
      { purchaseUUID: "p1", discounts: [], timestamp: "2024-01-01T00:00:00Z" },
    ]);
    expect(result).toHaveLength(0);
  });
});

// ── pollSquareRedemptions (Effect integration with fixture client) ─────────────

describe("pollSquareRedemptions", () => {
  test("calls listOrders and maps results to RedemptionCount[]", async () => {
    const client = makeFixtureSquareClient(SQUARE_ORDERS_FIXTURE);
    const layer = Layer.succeed(SquareClient, client);

    const result = await Effect.runPromise(
      Effect.provide(pollSquareRedemptions(Date.now() - 86400000), layer),
    );

    expect(result.length).toBeGreaterThan(0);
    const a1b2 = result.find((r) => r.voucherCode === "A1B2C3D4E5F6");
    expect(a1b2?.count).toBe(2);
  });

  test("propagates ProviderError from client", async () => {
    const client: ISquareClient = {
      listOrders: () =>
        Effect.fail(new ProviderError({ provider: "square", message: "Unauthorized" })),
    };
    const layer = Layer.succeed(SquareClient, client);

    const result = await Effect.runPromise(
      Effect.either(Effect.provide(pollSquareRedemptions(Date.now()), layer)),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ProviderError);
      expect(result.left.provider).toBe("square");
    }
  });
});

// ── pollZettleRedemptions (Effect integration with fixture client) ─────────────

describe("pollZettleRedemptions", () => {
  test("calls listPurchases and maps results to RedemptionCount[]", async () => {
    const client = makeFixtureZettleClient(ZETTLE_PURCHASES_FIXTURE);
    const layer = Layer.succeed(ZettleClient, client);

    const result = await Effect.runPromise(
      Effect.provide(pollZettleRedemptions(Date.now() - 86400000), layer),
    );

    expect(result.length).toBeGreaterThan(0);
    const a1b2 = result.find((r) => r.voucherCode === "A1B2C3D4E5F6");
    expect(a1b2?.count).toBe(2);
  });

  test("propagates ProviderError from client", async () => {
    const client: IZettleClient = {
      listPurchases: () =>
        Effect.fail(new ProviderError({ provider: "zettle", message: "Rate limited" })),
    };
    const layer = Layer.succeed(ZettleClient, client);

    const result = await Effect.runPromise(
      Effect.either(Effect.provide(pollZettleRedemptions(Date.now()), layer)),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ProviderError);
      expect(result.left.provider).toBe("zettle");
    }
  });
});

// ── pollRedemptions (provider-agnostic dispatcher) ────────────────────────────

describe("pollRedemptions", () => {
  test("dispatches to Square adapter for square connection", async () => {
    const connection: PosConnectionDoc = {
      _id: "conn-1",
      businessId: "biz-1",
      provider: "square",
      credentials: JSON.stringify({ apiKey: "test-key" }),
      connectedAt: Date.now(),
    };

    const repo = makeFixturePosRepo([connection]);
    const squareClient = makeFixtureSquareClient(SQUARE_ORDERS_FIXTURE);
    const zettleClient = makeFixtureZettleClient([]); // should not be called

    const layer = Layer.mergeAll(
      Layer.succeed(PosConnectionRepo, repo),
      Layer.succeed(SquareClient, squareClient),
      Layer.succeed(ZettleClient, zettleClient),
    );

    const result = await Effect.runPromise(
      Effect.provide(pollRedemptions("conn-1", Date.now() - 86400000), layer),
    );

    const a1b2 = result.find((r) => r.voucherCode === "A1B2C3D4E5F6");
    expect(a1b2?.count).toBe(2);
  });

  test("dispatches to Zettle adapter for zettle connection", async () => {
    const connection: PosConnectionDoc = {
      _id: "conn-2",
      businessId: "biz-2",
      provider: "zettle",
      credentials: JSON.stringify({ apiKey: "test-key" }),
      connectedAt: Date.now(),
    };

    const repo = makeFixturePosRepo([connection]);
    const squareClient = makeFixtureSquareClient([]); // should not be called
    const zettleClient = makeFixtureZettleClient(ZETTLE_PURCHASES_FIXTURE);

    const layer = Layer.mergeAll(
      Layer.succeed(PosConnectionRepo, repo),
      Layer.succeed(SquareClient, squareClient),
      Layer.succeed(ZettleClient, zettleClient),
    );

    const result = await Effect.runPromise(
      Effect.provide(pollRedemptions("conn-2", Date.now() - 86400000), layer),
    );

    const a1b2 = result.find((r) => r.voucherCode === "A1B2C3D4E5F6");
    expect(a1b2?.count).toBe(2);
  });

  test("returns empty array for unknown posConnectionId", async () => {
    const repo = makeFixturePosRepo([]);
    const squareClient = makeFixtureSquareClient([]);
    const zettleClient = makeFixtureZettleClient([]);

    const layer = Layer.mergeAll(
      Layer.succeed(PosConnectionRepo, repo),
      Layer.succeed(SquareClient, squareClient),
      Layer.succeed(ZettleClient, zettleClient),
    );

    const result = await Effect.runPromise(
      Effect.provide(pollRedemptions("unknown", Date.now()), layer),
    );

    expect(result).toHaveLength(0);
  });
});
