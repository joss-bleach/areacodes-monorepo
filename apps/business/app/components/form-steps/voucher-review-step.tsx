import type { UseFormReturn } from "react-hook-form";
import { Separator } from "@repo/ui";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";

const KIND_LABELS: Record<VoucherFormValues["discount"]["kind"], string> = {
  percentage: "Percentage off",
  fixed_amount: "Fixed amount off",
  free_item: "Free item",
  bogof: "Buy one, get one free",
  custom: "Custom offer",
};

function formatDiscountSummary(discount: VoucherFormValues["discount"]): string {
  switch (discount.kind) {
    case "percentage":
      return `${discount.value ?? 0}% off`;
    case "fixed_amount":
      return `£${(discount.value ?? 0).toFixed(2)} off`;
    case "free_item":
      return `Free ${discount.itemName ?? "item"}`;
    case "bogof":
      return "Buy one, get one free";
    case "custom":
      return discount.customText ?? "";
  }
}

interface VoucherReviewStepProps {
  form: UseFormReturn<VoucherFormValues>;
}

export const VoucherReviewStep = ({ form }: VoucherReviewStepProps) => {
  const values = form.getValues();
  const { discount, title, description, voucherValidFrom, voucherValidTo, voucherTerms } = values;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold">Review your voucher</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Check the details before creating.
        </p>
      </div>

      <div className="border border-border">
        <ReviewRow label="Provider" value="Manual" />
        <Separator />
        <ReviewRow label="Discount type" value={KIND_LABELS[discount.kind]} />
        <Separator />
        <ReviewRow label="Offer" value={formatDiscountSummary(discount)} />
        <Separator />
        <ReviewRow label="Title" value={title} />
        <Separator />
        <ReviewRow label="Description" value={description} />
        <Separator />
        <ReviewRow
          label="Valid from"
          value={voucherValidFrom ? voucherValidFrom.toLocaleDateString("en-GB") : "—"}
        />
        <Separator />
        <ReviewRow
          label="Valid to"
          value={voucherValidTo ? voucherValidTo.toLocaleDateString("en-GB") : "—"}
        />
        {voucherTerms && (
          <>
            <Separator />
            <ReviewRow label="Terms" value={voucherTerms} />
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Manual vouchers are immediately visible to customers once created.
      </p>
    </div>
  );
};

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 px-4 py-3">
    <span className="text-xs font-medium text-muted-foreground shrink-0 w-28">{label}</span>
    <span className="text-xs text-right">{value}</span>
  </div>
);
