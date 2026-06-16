// Domain package — Effect services and pure modules live here.
// Individual modules are exported from this barrel as they are added.
export * as BusinessService from "./business-service.js";
export {
  BusinessRepo,
  NotFound,
  Unauthorized,
  type BusinessDoc,
  type VoucherDoc,
  type CreateBusinessArgs,
  type UpdateBusinessArgs,
  type IBusinessRepo,
} from "./business-service.js";
export * as VoucherService from "./voucher-service.js";
export {
  VoucherRepo,
  ClaimRepo,
  RevealRepo,
  type BusinessRef,
  type VoucherDoc as VoucherServiceDoc,
  type CreateVoucherArgs,
  type UpdateVoucherArgs,
  type IVoucherRepo,
  type ClaimDoc,
  type RevealDoc,
  type IClaimRepo,
  type IRevealRepo,
  type WalletEntry,
  type WalletEntryState,
  VoucherExpired,
  AlreadyRevealed,
  ClaimNotFound,
  VouchersSuspended,
} from "./voucher-service.js";
export {
  voucherStatus,
  voucherFormatLabel,
  type VoucherStatus,
  type VoucherFormat,
} from "./voucher-presentation.js";
export * as SubscriptionService from "./subscription-service.js";
export {
  SubscriptionRepo,
  BusinessNotFound,
  type SubscriptionDoc,
  type SubscriptionStatus,
  type GateStatus,
  type StripeWebhookEvent,
  type ISubscriptionRepo,
} from "./subscription-service.js";
