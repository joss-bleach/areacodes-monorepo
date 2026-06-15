import { Effect, Either, Layer } from "effect";
import { describe, expect, test } from "vitest";
import {
  VoucherRepo,
  type BusinessRef,
  type IVoucherRepo,
  type VoucherDoc,
} from "../voucher-service.js";
import * as VoucherService from "../voucher-service.js";

function makeTestRepo(options: {
  businesses?: BusinessRef[];
  vouchers?: VoucherDoc[];
  deletedStorageIds?: string[];
}) {
  const businesses = [...(options.businesses ?? [])];
  const vouchers = [...(options.vouchers ?? [])];
  const deletedStorageIds = options.deletedStorageIds ?? [];
  let nextId = 1;

  const repo: IVoucherRepo = {
    findBusiness: (id) =>
      Effect.succeed(businesses.find((b) => b._id === id) ?? null),
    findById: (id) =>
      Effect.succeed(vouchers.find((v) => v._id === id) ?? null),
    insert: (data) => {
      const id = `voucher-${nextId++}`;
      vouchers.push({ ...data, _id: id });
      return Effect.succeed(id);
    },
    patch: (id, data) => {
      const idx = vouchers.findIndex((v) => v._id === id);
      if (idx !== -1) {
        vouchers[idx] = { ...vouchers[idx]!, ...data };
      }
      return Effect.void;
    },
    deleteStorage: (storageId) => {
      deletedStorageIds.push(storageId);
      return Effect.void;
    },
  };

  const layer = Layer.succeed(VoucherRepo, repo);
  return { layer, businesses, vouchers, deletedStorageIds };
}

const baseArgs = {
  title: "10% Off",
  description: "Get 10% off your order",
  voucherFormat: "generated_text" as const,
  voucherValidFrom: 1_000_000,
  voucherValidTo: 2_000_000,
};

const existingBusiness = (overrides: Partial<BusinessRef> = {}): BusinessRef => ({
  _id: "biz-1",
  userId: "user-owner",
  ...overrides,
});

const existingVoucher = (overrides: Partial<VoucherDoc> = {}): VoucherDoc => ({
  _id: "voucher-existing",
  businessId: "biz-1",
  userId: "user-owner",
  title: "Old Title",
  description: "Old description",
  voucherFormat: "generated_text",
  voucherValidFrom: 1_000_000,
  voucherValidTo: 2_000_000,
  ...overrides,
});

describe("VoucherService.create", () => {
  test("happy path: voucher created and linked to business", async () => {
    const { layer, vouchers } = makeTestRepo({
      businesses: [existingBusiness()],
    });

    const id = await Effect.runPromise(
      Effect.provide(
        VoucherService.create("user-owner", "biz-1", baseArgs),
        layer,
      ),
    );

    expect(id).toBe("voucher-1");
    expect(vouchers[0]).toMatchObject({
      _id: "voucher-1",
      businessId: "biz-1",
      userId: "user-owner",
      title: "10% Off",
    });
  });

  test("returns Unauthorized when caller does not own the business", async () => {
    const { layer } = makeTestRepo({
      businesses: [existingBusiness({ userId: "user-owner" })],
    });

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.create("wrong-user", "biz-1", baseArgs)),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("Unauthorized");
    }
  });
});

describe("VoucherService.update", () => {
  test("cleans up old storage asset when a new one is supplied", async () => {
    const { layer, deletedStorageIds } = makeTestRepo({
      vouchers: [
        existingVoucher({ _id: "v-1", userId: "user-1", voucherStorageId: "old-storage" }),
      ],
    });

    await Effect.runPromise(
      Effect.provide(
        VoucherService.update("user-1", "v-1", {
          ...baseArgs,
          voucherStorageId: "new-storage",
        }),
        layer,
      ),
    );

    expect(deletedStorageIds).toContain("old-storage");
  });

  test("does not delete storage when same storageId is supplied", async () => {
    const { layer, deletedStorageIds } = makeTestRepo({
      vouchers: [
        existingVoucher({ _id: "v-1", userId: "user-1", voucherStorageId: "same-storage" }),
      ],
    });

    await Effect.runPromise(
      Effect.provide(
        VoucherService.update("user-1", "v-1", {
          ...baseArgs,
          voucherStorageId: "same-storage",
        }),
        layer,
      ),
    );

    expect(deletedStorageIds).not.toContain("same-storage");
  });

  test("returns NotFound for a non-existent voucher", async () => {
    const { layer } = makeTestRepo({});

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.update("user-1", "nonexistent", baseArgs)),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("NotFound");
    }
  });

  test("returns Unauthorized when owner does not match", async () => {
    const { layer } = makeTestRepo({
      vouchers: [existingVoucher({ _id: "v-1", userId: "user-owner" })],
    });

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.update("wrong-user", "v-1", baseArgs)),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("Unauthorized");
    }
  });
});

describe("VoucherService.softDelete", () => {
  test("sets deletedAt and cleans up storage asset", async () => {
    const { layer, vouchers, deletedStorageIds } = makeTestRepo({
      vouchers: [
        existingVoucher({ _id: "v-1", userId: "user-1", voucherStorageId: "voucher-storage" }),
      ],
    });

    await Effect.runPromise(
      Effect.provide(VoucherService.softDelete("user-1", "v-1"), layer),
    );

    expect(vouchers[0]!.deletedAt).toBeTypeOf("number");
    expect(deletedStorageIds).toContain("voucher-storage");
  });

  test("sets deletedAt when no storage asset exists", async () => {
    const { layer, vouchers } = makeTestRepo({
      vouchers: [existingVoucher({ _id: "v-1", userId: "user-1" })],
    });

    await Effect.runPromise(
      Effect.provide(VoucherService.softDelete("user-1", "v-1"), layer),
    );

    expect(vouchers[0]!.deletedAt).toBeTypeOf("number");
  });

  test("returns NotFound for a non-existent voucher", async () => {
    const { layer } = makeTestRepo({});

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.softDelete("user-1", "nonexistent")),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("NotFound");
    }
  });

  test("returns Unauthorized when owner does not match", async () => {
    const { layer } = makeTestRepo({
      vouchers: [existingVoucher({ _id: "v-1", userId: "user-owner" })],
    });

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(VoucherService.softDelete("wrong-user", "v-1")),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("Unauthorized");
    }
  });
});
