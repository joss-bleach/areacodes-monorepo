export interface Industry {
  _id: string;
  name: string;
  category: string;
  slug: string;
  _creationTime: number;
}

export interface Business {
  _id: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  websiteUrl: string;
  logoStorageId?: string;
  logoUrl?: string | null;
  industryId: string;
  address: string;
  latitude: number;
  longitude: number;
  deletedAt?: number;
  flaggedAt?: number;
  _creationTime: number;
}

export type DiscountKind = "percentage" | "fixed_amount" | "free_item" | "bogof" | "custom";
export type Provider = "square" | "manual";
export type ProvisioningStatus = "not_required" | "pending" | "provisioned" | "failed";

export interface Discount {
  kind: DiscountKind;
  value?: number;
  currency?: string;
  itemName?: string;
  customText?: string;
}

export interface Provisioning {
  status: ProvisioningStatus;
  externalId?: string;
  lastError?: string;
  lastAttemptAt?: number;
  provisionedAt?: number;
}

export interface Voucher {
  _id: string;
  businessId: string;
  userId: string;
  title: string;
  description: string;
  provider: Provider;
  discount: Discount;
  provisioning: Provisioning;
  voucherTerms?: string;
  voucherValidFrom: number;
  voucherValidTo: number;
  deletedAt?: number;
  flaggedAt?: number;
  _creationTime: number;
}

export interface BusinessWithVouchers extends Business {
  industry: Industry | null;
  vouchers: Voucher[];
}

export interface VoucherWithBusiness extends Voucher {
  business: Business & { industry: Industry | null; logoUrl?: string | null };
}
