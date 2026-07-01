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
  type Provider,
  type DiscountKind,
  type Discount,
  type Provisioning,
  type ProvisioningStatus,
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
  type VoucherStatus,
} from "./voucher-presentation.js";
export * as ProviderCapabilities from "./provider-capabilities.js";
export {
  getCapabilities,
  supportsKind,
  deriveManualIdempotencyKey,
  deriveSquareIdempotencyKey,
  deriveRedemptionUrl,
  validateManualBurn,
  type ProviderCapabilityRow,
  type PresentationStyle,
  type ReconciliationMechanism,
  type BurnValidationInput,
  type BurnValidationResult,
} from "./provider-capabilities.js";
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
export * as PilotService from "./pilot-service.js";
export {
  PilotConfigRepo,
  type IPilotConfigRepo,
} from "./pilot-service.js";
export * as PilotAnalyticsService from "./pilot-analytics-service.js";
export {
  PilotAnalyticsRepo,
  AdminAnalyticsRepo,
  type IPilotAnalyticsRepo,
  type IAdminAnalyticsRepo,
  type VoucherStat,
  type WeeklyFunnelRow,
  type BusinessLeaderboardEntry,
} from "./pilot-analytics-service.js";
export * as AdminBusinessService from "./admin-business-service.js";
export {
  AuthAdminPort,
  EmailPort,
  AuthAdminError,
  EmailError,
  type IAuthAdminPort,
  type IEmailPort,
  type AdminAddBusinessArgs,
} from "./admin-business-service.js";
export {
  deriveVoucherCopy,
  type VoucherCopy,
} from "./voucher-copy.js";
export * as FeedbackService from "./feedback-service.js";
export {
  LLMPort,
  GitHubPort,
  LLMError,
  GitHubError,
  type ILLMPort,
  type IGitHubPort,
  type FeedbackIssue,
} from "./feedback-service.js";
export {
  mapDiscountToCatalogObject,
  SquareProvisioner,
  ProvisionError,
  AuthError,
  RateLimited,
  type ISquareProvisioner,
  type SquareCatalogDiscountRequest,
  type SquareCatalogDiscountData,
  type SquareCatalogObject,
} from "./square-provisioner.js";
