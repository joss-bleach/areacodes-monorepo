import { Context, Data, Effect } from "effect";
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

// ── Additional typed errors ───────────────────────────────────────────────────

export class VoucherExpired extends Data.TaggedError("VoucherExpired")<{}> {}
export class AlreadyRevealed extends Data.TaggedError("AlreadyRevealed")<{}> {}
export class ClaimNotFound extends Data.TaggedError("ClaimNotFound")<{ id: string }> {}

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

// ── Claim / Reveal / Wallet types ─────────────────────────────────────────────

export interface ClaimDoc {
  _id: string;
  customerId: string;
  voucherId: string;
  claimedAt: number;
}

export interface RevealDoc {
  _id: string;
  claimId: string;
  voucherCode: string;
  revealedAt: number;
  expiresAt: number;
  redeemedAt?: number;
}

export type WalletEntryState = "claimed" | "revealed" | "expired";

export interface WalletEntry {
  claimId: string;
  voucherId: string;
  claimedAt: number;
  state: WalletEntryState;
  activeCode: string | null;
  codeExpiresAt: number | null;
  voucher: { _id: string; title: string; voucherValidTo: number } | null;
}

// ── Claim / Reveal repositories ───────────────────────────────────────────────

export interface IClaimRepo {
  readonly findByCustomerVoucher: (
    customerId: string,
    voucherId: string,
  ) => Effect.Effect<ClaimDoc | null>;
  readonly findById: (id: string) => Effect.Effect<ClaimDoc | null>;
  readonly findByCustomer: (customerId: string) => Effect.Effect<ClaimDoc[]>;
  readonly insert: (data: Omit<ClaimDoc, "_id">) => Effect.Effect<string>;
}

export class ClaimRepo extends Context.Tag("@areacodes/domain/ClaimRepo")<
  ClaimRepo,
  IClaimRepo
>() {}

export interface IRevealRepo {
  readonly findByClaim: (claimId: string) => Effect.Effect<RevealDoc | null>;
  readonly insert: (data: Omit<RevealDoc, "_id">) => Effect.Effect<string>;
}

export class RevealRepo extends Context.Tag("@areacodes/domain/RevealRepo")<
  RevealRepo,
  IRevealRepo
>() {}

// ── Code generation ───────────────────────────────────────────────────────────

function generateVoucherCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]!).join("");
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// ── Claim ─────────────────────────────────────────────────────────────────────

export const claim = (
  customerId: string,
  voucherId: string,
  now: number,
): Effect.Effect<string, VoucherExpired, VoucherRepo | ClaimRepo> =>
  Effect.gen(function* () {
    const voucherRepo = yield* VoucherRepo;
    const claimRepo = yield* ClaimRepo;

    const voucher = yield* voucherRepo.findById(voucherId);
    if (!voucher || voucher.voucherValidTo < now) {
      return yield* Effect.fail(new VoucherExpired());
    }

    const existing = yield* claimRepo.findByCustomerVoucher(customerId, voucherId);
    if (existing) return existing._id;

    return yield* claimRepo.insert({ customerId, voucherId, claimedAt: now });
  });

// ── Reveal ────────────────────────────────────────────────────────────────────

export const reveal = (
  claimId: string,
  now: number,
): Effect.Effect<
  { claimId: string; voucherCode: string; expiresAt: number },
  AlreadyRevealed | ClaimNotFound,
  ClaimRepo | RevealRepo
> =>
  Effect.gen(function* () {
    const claimRepo = yield* ClaimRepo;
    const revealRepo = yield* RevealRepo;

    const claimDoc = yield* claimRepo.findById(claimId);
    if (!claimDoc) return yield* Effect.fail(new ClaimNotFound({ id: claimId }));

    const latestReveal = yield* revealRepo.findByClaim(claimId);
    if (latestReveal && latestReveal.expiresAt > now) {
      return yield* Effect.fail(new AlreadyRevealed());
    }

    const voucherCode = generateVoucherCode();
    const expiresAt = now + TWO_HOURS_MS;

    yield* revealRepo.insert({ claimId, voucherCode, revealedAt: now, expiresAt });

    return { claimId, voucherCode, expiresAt };
  });

// ── Wallet ────────────────────────────────────────────────────────────────────

export const getWallet = (
  customerId: string,
  now: number,
): Effect.Effect<WalletEntry[], never, ClaimRepo | VoucherRepo | RevealRepo> =>
  Effect.gen(function* () {
    const claimRepo = yield* ClaimRepo;
    const voucherRepo = yield* VoucherRepo;
    const revealRepo = yield* RevealRepo;

    const claims = yield* claimRepo.findByCustomer(customerId);

    return yield* Effect.forEach(
      claims,
      (c) =>
        Effect.gen(function* () {
          const voucher = yield* voucherRepo.findById(c.voucherId);
          const latestReveal = yield* revealRepo.findByClaim(c._id);

          let state: WalletEntryState;
          if (voucher && voucher.voucherValidTo < now) {
            state = "expired";
          } else if (latestReveal && latestReveal.expiresAt > now) {
            state = "revealed";
          } else {
            state = "claimed";
          }

          return {
            claimId: c._id,
            voucherId: c.voucherId,
            claimedAt: c.claimedAt,
            state,
            activeCode: state === "revealed" ? latestReveal!.voucherCode : null,
            codeExpiresAt: state === "revealed" ? latestReveal!.expiresAt : null,
            voucher: voucher
              ? { _id: voucher._id, title: voucher.title, voucherValidTo: voucher.voucherValidTo }
              : null,
          } satisfies WalletEntry;
        }),
      { concurrency: "unbounded" },
    );
  });
