import { Context, Effect } from "effect";
import { NotFound, Unauthorized } from "./business-service.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BusinessRef {
  _id: string;
  userId: string;
}

export interface VoucherDoc {
  _id: string;
  businessId: string;
  userId: string;
  title: string;
  description: string;
  voucherFormat: "barcode" | "qr_code" | "generated_text";
  voucherStorageId?: string;
  voucherGenCode?: string;
  voucherTerms?: string;
  voucherValidFrom: number;
  voucherValidTo: number;
  deletedAt?: number;
}

export interface CreateVoucherArgs {
  title: string;
  description: string;
  voucherFormat: "barcode" | "qr_code" | "generated_text";
  voucherStorageId?: string;
  voucherGenCode?: string;
  voucherTerms?: string;
  voucherValidFrom: number;
  voucherValidTo: number;
}

export type UpdateVoucherArgs = CreateVoucherArgs;

export { NotFound, Unauthorized };

// ── Repository interface (injected dependency) ────────────────────────────────

export interface IVoucherRepo {
  readonly findBusiness: (id: string) => Effect.Effect<BusinessRef | null>;
  readonly findById: (id: string) => Effect.Effect<VoucherDoc | null>;
  readonly insert: (data: Omit<VoucherDoc, "_id">) => Effect.Effect<string>;
  readonly patch: (id: string, data: Partial<VoucherDoc>) => Effect.Effect<void>;
  readonly deleteStorage: (storageId: string) => Effect.Effect<void>;
}

export class VoucherRepo extends Context.Tag("@areacodes/domain/VoucherRepo")<
  VoucherRepo,
  IVoucherRepo
>() {}

// ── Service functions ─────────────────────────────────────────────────────────

export const create = (
  ownerId: string,
  businessId: string,
  args: CreateVoucherArgs,
): Effect.Effect<string, Unauthorized, VoucherRepo> =>
  Effect.gen(function* () {
    const repo = yield* VoucherRepo;
    const business = yield* repo.findBusiness(businessId);

    if (!business || business.userId !== ownerId) {
      return yield* Effect.fail(new Unauthorized());
    }

    return yield* repo.insert({
      businessId,
      userId: ownerId,
      title: args.title,
      description: args.description,
      voucherFormat: args.voucherFormat,
      voucherStorageId: args.voucherStorageId,
      voucherGenCode: args.voucherGenCode,
      voucherTerms: args.voucherTerms,
      voucherValidFrom: args.voucherValidFrom,
      voucherValidTo: args.voucherValidTo,
    });
  });

export const update = (
  ownerId: string,
  voucherId: string,
  args: UpdateVoucherArgs,
): Effect.Effect<void, NotFound | Unauthorized, VoucherRepo> =>
  Effect.gen(function* () {
    const repo = yield* VoucherRepo;
    const voucher = yield* repo.findById(voucherId);

    if (!voucher) return yield* Effect.fail(new NotFound({ id: voucherId }));
    if (voucher.userId !== ownerId) return yield* Effect.fail(new Unauthorized());

    if (
      voucher.voucherStorageId &&
      args.voucherStorageId &&
      voucher.voucherStorageId !== args.voucherStorageId
    ) {
      yield* repo.deleteStorage(voucher.voucherStorageId);
    }

    yield* repo.patch(voucherId, {
      title: args.title,
      description: args.description,
      voucherFormat: args.voucherFormat,
      voucherStorageId: args.voucherStorageId,
      voucherGenCode: args.voucherGenCode,
      voucherTerms: args.voucherTerms,
      voucherValidFrom: args.voucherValidFrom,
      voucherValidTo: args.voucherValidTo,
    });
  });

export const softDelete = (
  ownerId: string,
  voucherId: string,
): Effect.Effect<{ success: boolean }, NotFound | Unauthorized, VoucherRepo> =>
  Effect.gen(function* () {
    const repo = yield* VoucherRepo;
    const voucher = yield* repo.findById(voucherId);

    if (!voucher) return yield* Effect.fail(new NotFound({ id: voucherId }));
    if (voucher.userId !== ownerId) return yield* Effect.fail(new Unauthorized());

    if (voucher.voucherStorageId) {
      yield* repo.deleteStorage(voucher.voucherStorageId);
    }

    yield* repo.patch(voucherId, { deletedAt: Date.now() });
    return { success: true };
  });
