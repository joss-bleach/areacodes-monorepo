import { Effect, Either, Layer } from "effect";
import { describe, expect, test } from "vitest";
import {
  BusinessRepo,
  type BusinessDoc,
  type IBusinessRepo,
  type VoucherDoc,
} from "../business-service.js";
import * as BusinessService from "../business-service.js";

function makeTestRepo(options: {
  businesses?: BusinessDoc[];
  vouchers?: VoucherDoc[];
  deletedStorageIds?: string[];
}) {
  const businesses = [...(options.businesses ?? [])];
  const vouchers = [...(options.vouchers ?? [])];
  const deletedStorageIds = options.deletedStorageIds ?? [];
  let nextId = 1;

  const repo: IBusinessRepo = {
    findBySlug: (slug) =>
      Effect.succeed(businesses.find((b) => b.slug === slug) ?? null),
    findById: (id) =>
      Effect.succeed(businesses.find((b) => b._id === id) ?? null),
    insert: (data) => {
      const id = `business-${nextId++}`;
      businesses.push({ ...data, _id: id });
      return Effect.succeed(id);
    },
    patch: (id, data) => {
      const idx = businesses.findIndex((b) => b._id === id);
      if (idx !== -1) {
        businesses[idx] = { ...businesses[idx]!, ...data };
      }
      return Effect.void;
    },
    findVouchersByBusiness: (businessId) =>
      Effect.succeed(vouchers.filter((v) => v.businessId === businessId)),
    patchVoucher: (id, data) => {
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

  const layer = Layer.succeed(BusinessRepo, repo);
  return { layer, businesses, vouchers, deletedStorageIds };
}

const baseArgs = {
  name: "My Business",
  description: "A test business",
  websiteUrl: "https://example.com",
  industryId: "industry-1",
  address: "123 Test St",
  latitude: 51.5,
  longitude: -0.1,
};

const existingBusiness = (overrides: Partial<BusinessDoc> = {}): BusinessDoc => ({
  _id: "biz-existing",
  userId: "user-owner",
  name: "My Business",
  slug: "my-business",
  description: "Existing",
  websiteUrl: "https://other.com",
  industryId: "industry-1",
  address: "456 Other St",
  latitude: 51.5,
  longitude: -0.1,
  ...overrides,
});

// RED: test create happy path
describe("BusinessService.create", () => {
  test("happy path: creates business with correct slug", async () => {
    const { layer, businesses } = makeTestRepo({});

    const id = await Effect.runPromise(
      Effect.provide(BusinessService.create("user-1", baseArgs), layer),
    );

    expect(id).toBe("business-1");
    expect(businesses[0]).toMatchObject({
      _id: "business-1",
      userId: "user-1",
      name: "My Business",
      slug: "my-business",
    });
  });

  test("slug collision: suffix applied when base slug is taken", async () => {
    const { layer, businesses } = makeTestRepo({
      businesses: [existingBusiness()],
    });

    await Effect.runPromise(
      Effect.provide(BusinessService.create("user-1", baseArgs), layer),
    );

    const created = businesses.find((b) => b.userId === "user-1");
    expect(created?.slug).toMatch(/^my-business-.+/);
    expect(created?.slug).not.toBe("my-business");
  });
});

// RED: test update authorization and re-slug behaviour
describe("BusinessService.update", () => {
  test("re-slugs when name changes", async () => {
    const { layer, businesses } = makeTestRepo({
      businesses: [existingBusiness({ _id: "biz-1", userId: "user-1", name: "Old Name", slug: "old-name" })],
    });

    await Effect.runPromise(
      Effect.provide(
        BusinessService.update("user-1", "biz-1", { ...baseArgs, name: "New Name" }),
        layer,
      ),
    );

    expect(businesses[0]!.slug).toBe("new-name");
  });

  test("does not re-slug when name is unchanged", async () => {
    const { layer, businesses } = makeTestRepo({
      businesses: [existingBusiness({ _id: "biz-1", userId: "user-1", slug: "custom-slug" })],
    });

    await Effect.runPromise(
      Effect.provide(
        BusinessService.update("user-1", "biz-1", baseArgs),
        layer,
      ),
    );

    expect(businesses[0]!.slug).toBe("custom-slug");
  });

  test("returns Unauthorized when owner does not match", async () => {
    const { layer } = makeTestRepo({
      businesses: [existingBusiness({ _id: "biz-1", userId: "user-owner" })],
    });

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(BusinessService.update("wrong-user", "biz-1", baseArgs)),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("Unauthorized");
    }
  });

  test("cleans up old logo when logo is replaced", async () => {
    const { layer, deletedStorageIds } = makeTestRepo({
      businesses: [
        existingBusiness({
          _id: "biz-1",
          userId: "user-1",
          logoStorageId: "old-logo-storage",
        }),
      ],
    });

    await Effect.runPromise(
      Effect.provide(
        BusinessService.update("user-1", "biz-1", {
          ...baseArgs,
          logoStorageId: "new-logo-storage",
        }),
        layer,
      ),
    );

    expect(deletedStorageIds).toContain("old-logo-storage");
  });
});

// RED: test softDelete cascade and NotFound
describe("BusinessService.softDelete", () => {
  test("cascades soft-delete to associated vouchers", async () => {
    const { layer, businesses, vouchers } = makeTestRepo({
      businesses: [existingBusiness({ _id: "biz-1", userId: "user-1" })],
      vouchers: [
        { _id: "v-1", businessId: "biz-1" },
        { _id: "v-2", businessId: "biz-1" },
      ],
    });

    await Effect.runPromise(
      Effect.provide(BusinessService.softDelete("user-1", "biz-1"), layer),
    );

    expect(vouchers[0]!.deletedAt).toBeTypeOf("number");
    expect(vouchers[1]!.deletedAt).toBeTypeOf("number");
    expect(businesses[0]!.deletedAt).toBeTypeOf("number");
  });

  test("cleans up voucher storage on soft-delete", async () => {
    const { layer, deletedStorageIds } = makeTestRepo({
      businesses: [existingBusiness({ _id: "biz-1", userId: "user-1" })],
      vouchers: [{ _id: "v-1", businessId: "biz-1", voucherStorageId: "voucher-storage-1" }],
    });

    await Effect.runPromise(
      Effect.provide(BusinessService.softDelete("user-1", "biz-1"), layer),
    );

    expect(deletedStorageIds).toContain("voucher-storage-1");
  });

  test("cleans up business logo on soft-delete", async () => {
    const { layer, deletedStorageIds } = makeTestRepo({
      businesses: [
        existingBusiness({ _id: "biz-1", userId: "user-1", logoStorageId: "logo-storage-1" }),
      ],
      vouchers: [],
    });

    await Effect.runPromise(
      Effect.provide(BusinessService.softDelete("user-1", "biz-1"), layer),
    );

    expect(deletedStorageIds).toContain("logo-storage-1");
  });

  test("returns NotFound for non-existent business", async () => {
    const { layer } = makeTestRepo({});

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(BusinessService.softDelete("user-1", "nonexistent")),
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
      businesses: [existingBusiness({ _id: "biz-1", userId: "user-owner" })],
    });

    const result = await Effect.runPromise(
      Effect.provide(
        Effect.either(BusinessService.softDelete("wrong-user", "biz-1")),
        layer,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("Unauthorized");
    }
  });
});
