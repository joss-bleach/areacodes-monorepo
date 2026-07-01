// ── Types ─────────────────────────────────────────────────────────────────────

export type DiscountKind = "percentage" | "fixed_amount" | "free_item" | "bogof" | "custom";
export type Provider = "square" | "manual";
export type PresentationStyle = "audit_code_only" | "redemption_url";
export type ReconciliationMechanism = "webhook_poll" | "first_party_burn";

export interface ProviderCapabilityRow {
  readonly provider: Provider;
  readonly provisionableKinds: readonly DiscountKind[];
  readonly attributesToCustomer: boolean;
  readonly presentation: PresentationStyle;
  readonly reconciliation: ReconciliationMechanism;
}

// ── Capability descriptor table ───────────────────────────────────────────────

const PROVIDER_CAPABILITIES: Record<Provider, ProviderCapabilityRow> = {
  square: {
    provider: "square",
    provisionableKinds: ["percentage", "fixed_amount"],
    attributesToCustomer: false,
    presentation: "audit_code_only",
    reconciliation: "webhook_poll",
  },
  manual: {
    provider: "manual",
    provisionableKinds: ["percentage", "fixed_amount", "free_item", "bogof", "custom"],
    attributesToCustomer: true,
    presentation: "redemption_url",
    reconciliation: "first_party_burn",
  },
};

export function getCapabilities(provider: Provider): ProviderCapabilityRow {
  return PROVIDER_CAPABILITIES[provider];
}

export function supportsKind(provider: Provider, kind: DiscountKind): boolean {
  return (PROVIDER_CAPABILITIES[provider].provisionableKinds as DiscountKind[]).includes(kind);
}

// ── Idempotency-key helpers ───────────────────────────────────────────────────

export function deriveManualIdempotencyKey(claimId: string): string {
  return `manual:${claimId}`;
}

export function deriveSquareIdempotencyKey(
  orderId: string,
  catalogDiscountId: string,
): string {
  return `square:${orderId}:${catalogDiscountId}`;
}

// ── Burn-validation predicate ─────────────────────────────────────────────────

export interface BurnValidationInput {
  voucher: {
    deletedAt?: number;
    flaggedAt?: number;
    voucherValidFrom: number;
    voucherValidTo: number;
    businessId: string;
    provider: Provider;
    provisioning: { status: string };
  };
  claimId: string;
  businessId: string;
  now: number;
  alreadyBurned: boolean;
}

export type BurnValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "deleted"
        | "flagged"
        | "expired"
        | "not_in_window"
        | "already_burned"
        | "wrong_business";
    };

export function validateManualBurn(input: BurnValidationInput): BurnValidationResult {
  const { voucher, businessId, now, alreadyBurned } = input;

  if (voucher.deletedAt !== undefined) return { valid: false, reason: "deleted" };
  if (voucher.flaggedAt !== undefined) return { valid: false, reason: "flagged" };
  if (voucher.voucherValidTo < now) return { valid: false, reason: "expired" };
  if (voucher.voucherValidFrom > now) return { valid: false, reason: "not_in_window" };
  if (alreadyBurned) return { valid: false, reason: "already_burned" };
  if (voucher.businessId !== businessId) return { valid: false, reason: "wrong_business" };

  return { valid: true };
}
