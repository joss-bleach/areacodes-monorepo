import { Context, Data, Effect } from "effect";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BusinessDoc {
  _id: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  websiteUrl: string;
  industryId: string;
  address: string;
  latitude: number;
  longitude: number;
  logoStorageId?: string;
  deletedAt?: number;
  flaggedAt?: number;
}

export interface VoucherDoc {
  _id: string;
  businessId: string;
  voucherStorageId?: string;
  deletedAt?: number;
}

export interface CreateBusinessArgs {
  name: string;
  description: string;
  websiteUrl: string;
  industryId: string;
  address: string;
  latitude: number;
  longitude: number;
  logoStorageId?: string;
}

export interface UpdateBusinessArgs {
  name: string;
  description: string;
  websiteUrl: string;
  industryId: string;
  address: string;
  latitude: number;
  longitude: number;
  logoStorageId?: string;
}

// ── Typed errors ─────────────────────────────────────────────────────────────

export class NotFound extends Data.TaggedError("NotFound")<{ id: string }> {}
export class Unauthorized extends Data.TaggedError("Unauthorized")<{}> {}

// ── Repository interface (injected dependency) ────────────────────────────────

export interface IBusinessRepo {
  readonly findBySlug: (slug: string) => Effect.Effect<BusinessDoc | null>;
  readonly findById: (id: string) => Effect.Effect<BusinessDoc | null>;
  readonly insert: (data: Omit<BusinessDoc, "_id">) => Effect.Effect<string>;
  readonly patch: (id: string, data: Partial<BusinessDoc>) => Effect.Effect<void>;
  readonly findVouchersByBusiness: (businessId: string) => Effect.Effect<VoucherDoc[]>;
  readonly patchVoucher: (id: string, data: { deletedAt: number }) => Effect.Effect<void>;
  readonly deleteStorage: (storageId: string) => Effect.Effect<void>;
}

export class BusinessRepo extends Context.Tag("@areacodes/domain/BusinessRepo")<
  BusinessRepo,
  IBusinessRepo
>() {}

// ── Private helpers ───────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Service functions ─────────────────────────────────────────────────────────

export const create = (
  ownerId: string,
  args: CreateBusinessArgs,
): Effect.Effect<string, never, BusinessRepo> =>
  Effect.gen(function* () {
    const repo = yield* BusinessRepo;
    const baseSlug = slugify(args.name);
    const existing = yield* repo.findBySlug(baseSlug);
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;
    return yield* repo.insert({
      userId: ownerId,
      slug,
      name: args.name,
      description: args.description,
      websiteUrl: args.websiteUrl,
      industryId: args.industryId,
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
      logoStorageId: args.logoStorageId,
    });
  });

export const update = (
  ownerId: string,
  businessId: string,
  args: UpdateBusinessArgs,
): Effect.Effect<void, NotFound | Unauthorized, BusinessRepo> =>
  Effect.gen(function* () {
    const repo = yield* BusinessRepo;
    const business = yield* repo.findById(businessId);

    if (!business) return yield* Effect.fail(new NotFound({ id: businessId }));
    if (business.userId !== ownerId) return yield* Effect.fail(new Unauthorized());

    let slug = business.slug;
    if (business.name !== args.name) {
      const baseSlug = slugify(args.name);
      const conflict = yield* repo.findBySlug(baseSlug);
      slug =
        conflict && conflict._id !== businessId
          ? `${baseSlug}-${Date.now()}`
          : baseSlug;
    }

    if (
      business.logoStorageId &&
      args.logoStorageId &&
      business.logoStorageId !== args.logoStorageId
    ) {
      yield* repo.deleteStorage(business.logoStorageId);
    }

    yield* repo.patch(businessId, {
      name: args.name,
      slug,
      description: args.description,
      websiteUrl: args.websiteUrl,
      industryId: args.industryId,
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
      logoStorageId: args.logoStorageId,
    });
  });

export const softDelete = (
  ownerId: string,
  businessId: string,
): Effect.Effect<{ success: boolean }, NotFound | Unauthorized, BusinessRepo> =>
  Effect.gen(function* () {
    const repo = yield* BusinessRepo;
    const business = yield* repo.findById(businessId);

    if (!business) return yield* Effect.fail(new NotFound({ id: businessId }));
    if (business.userId !== ownerId) return yield* Effect.fail(new Unauthorized());

    const vouchers = yield* repo.findVouchersByBusiness(businessId);
    for (const voucher of vouchers) {
      if (voucher.voucherStorageId) {
        yield* repo.deleteStorage(voucher.voucherStorageId);
      }
      yield* repo.patchVoucher(voucher._id, { deletedAt: Date.now() });
    }

    if (business.logoStorageId) {
      yield* repo.deleteStorage(business.logoStorageId);
    }

    yield* repo.patch(businessId, { deletedAt: Date.now() });
    return { success: true };
  });
