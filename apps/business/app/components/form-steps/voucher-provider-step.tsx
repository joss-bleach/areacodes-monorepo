import { Controller, type UseFormReturn } from "react-hook-form";
import { Check } from "lucide-react";
import { cn } from "@repo/ui";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";
import { SquareLogo } from "~/components/voucher-wizard/square-logo";
import { MetaChip } from "~/components/voucher-wizard/meta-chip";

type Provider = VoucherFormValues["provider"];

interface ProviderOption {
  value: Provider;
  label: string;
  description: string;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    value: "square",
    label: "Square POS",
    description:
      "Pushed to your till as a tappable discount. Redemptions reconcile automatically from real paid orders.",
  },
  {
    value: "manual",
    label: "Manual redemption",
    description:
      "Staff scan the customer's voucher and confirm on our page. Works with any POS, and tracks each customer.",
  },
];

interface VoucherProviderStepProps {
  form: UseFormReturn<VoucherFormValues>;
}

export const VoucherProviderStep = ({ form }: VoucherProviderStepProps) => {
  return (
    <Controller
      name="provider"
      control={form.control}
      render={({ field }) => (
        <div className="flex w-full gap-4">
          {PROVIDER_OPTIONS.map((option) => {
            const selected = field.value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  field.onChange(option.value);
                  const caps =
                    option.value === "square"
                      ? ["percentage", "fixed_amount"]
                      : ["percentage", "fixed_amount", "free_item", "bogof", "custom"];
                  const currentKind = form.getValues("discount.kind");
                  if (!caps.includes(currentKind)) {
                    form.setValue("discount.kind", "percentage");
                    form.setValue("discount.value", undefined);
                    form.setValue("discount.itemName", undefined);
                    form.setValue("discount.customText", undefined);
                  }
                }}
                className={cn(
                  "flex grow basis-0 flex-col gap-4 border bg-card p-6 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-foreground" : "border-border hover:border-foreground/50",
                )}
              >
                <div className="flex items-center justify-between">
                  {option.value === "square" ? (
                    <SquareLogo className="size-11 text-foreground" />
                  ) : (
                    <div className="flex size-11 shrink-0 items-center justify-center bg-foreground">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="3" width="7" height="7" stroke="#000000" strokeWidth="2" />
                        <rect x="14" y="3" width="7" height="7" stroke="#000000" strokeWidth="2" />
                        <rect x="3" y="14" width="7" height="7" stroke="#000000" strokeWidth="2" />
                        <rect x="14" y="14" width="7" height="7" stroke="#000000" strokeWidth="2" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center border",
                      selected ? "border-foreground bg-foreground" : "border-border",
                    )}
                  >
                    {selected && <Check className="size-3" strokeWidth={3.5} color="#000000" />}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold leading-4.5 tracking-[-0.02em] text-foreground">
                      {option.label}
                    </span>
                    <MetaChip tone={option.value === "square" ? "success" : "neutral"}>
                      {option.value === "square" ? "Connected" : "Always on"}
                    </MetaChip>
                  </div>
                  <p className="text-xs leading-[150%] text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    />
  );
};
