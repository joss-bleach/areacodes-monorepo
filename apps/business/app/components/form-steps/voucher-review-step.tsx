import type { UseFormReturn } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { cn } from "@repo/ui";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";
import { MetaChip } from "~/components/voucher-wizard/meta-chip";

function formatDiscountSummary(discount: VoucherFormValues["discount"]): string {
  switch (discount.kind) {
    case "percentage":
      return `${discount.value ?? 0}% off the order`;
    case "fixed_amount":
      return `£${(discount.value ?? 0).toFixed(2)} off the order`;
    case "free_item":
      return `Free ${discount.itemName ?? "item"}`;
    case "bogof":
      return "Buy one, get one free";
    case "custom":
      return discount.customText ?? "";
  }
}

const KIND_SYMBOL: Record<VoucherFormValues["discount"]["kind"], string> = {
  percentage: "%",
  fixed_amount: "£",
  free_item: "★",
  bogof: "2·1",
  custom: "✎",
};

const REDEMPTION_LABEL: Record<VoucherFormValues["provider"], string> = {
  square: "Cashier taps at the till",
  manual: "Staff scan and confirm on our page",
};

interface VoucherReviewStepProps {
  form: UseFormReturn<VoucherFormValues>;
}

export const VoucherReviewStep = ({ form }: VoucherReviewStepProps) => {
  const values = form.getValues();
  const { provider, discount, title, description, voucherValidFrom, voucherValidTo } = values;

  const validRange =
    voucherValidFrom && voucherValidTo
      ? `${voucherValidFrom.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — ${voucherValidTo.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
      : "—";

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="text-xl font-bold uppercase leading-6 tracking-[-0.025em] text-foreground">
              {title}
            </span>
            <p className="text-xs leading-[150%] text-muted-foreground">{description}</p>
          </div>
          <div className="flex size-13 shrink-0 items-center justify-center bg-foreground">
            <span className="font-mono text-[22px] font-bold leading-7 text-background">
              {KIND_SYMBOL[discount.kind]}
            </span>
          </div>
        </div>

        <div className="flex flex-col px-6 pb-5 pt-2">
          <ReviewRow label="Runs on">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold leading-4 text-foreground">
                {provider === "square" ? "Square POS" : "Manual"}
              </span>
              {provider === "square" && <MetaChip tone="success">Connected</MetaChip>}
            </div>
          </ReviewRow>
          <ReviewRow label="Discount" value={formatDiscountSummary(discount)} />
          <ReviewRow label="Valid" value={validRange} />
          <ReviewRow label="Redemption" value={REDEMPTION_LABEL[provider]} last />
        </div>
      </div>

      {provider === "square" ? (
        <div className="flex items-start gap-2.5 border border-warning-border bg-warning-bg px-3.5 py-3">
          <AlertTriangle
            className="mt-px size-[15px] shrink-0 text-warning-foreground"
            strokeWidth={2}
          />
          <p className="text-xs leading-[150%] text-warning-foreground">
            This voucher publishes to your Square catalogue and becomes visible to customers once
            it is live. That usually takes a few seconds — you will see its status update
            automatically.
          </p>
        </div>
      ) : (
        <p className="text-xs leading-[150%] text-muted-foreground">
          Manual vouchers are immediately visible to customers once created.
        </p>
      )}
    </div>
  );
};

const ReviewRow = ({
  label,
  value,
  children,
  last = false,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  last?: boolean;
}) => (
  <div
    className={cn(
      "flex items-center justify-between py-3",
      !last && "border-b border-border",
    )}
  >
    <span className="text-xs leading-4 text-muted-foreground">{label}</span>
    {children ?? <span className="text-[13px] leading-4 text-foreground">{value}</span>}
  </div>
);
