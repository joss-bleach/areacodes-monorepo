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
