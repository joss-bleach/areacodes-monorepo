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
  type BusinessRef,
  type VoucherDoc as VoucherServiceDoc,
  type CreateVoucherArgs,
  type UpdateVoucherArgs,
  type IVoucherRepo,
} from "./voucher-service.js";
export {
  voucherStatus,
  voucherFormatLabel,
  type VoucherStatus,
  type VoucherFormat,
} from "./voucher-presentation.js";
