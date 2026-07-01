import { Controller, type UseFormReturn } from "react-hook-form";
import { cn } from "@repo/ui";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";

type Provider = VoucherFormValues["provider"];

interface ProviderOption {
  value: Provider;
  label: string;
  hint: string;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    value: "square",
    label: "Square",
    hint: "Percentage off · Fixed amount — tappable at your till",
  },
  {
    value: "manual",
    label: "Manual",
    hint: "All offer types — redeemed by QR scan",
  },
];

interface VoucherProviderStepProps {
  form: UseFormReturn<VoucherFormValues>;
}

export const VoucherProviderStep = ({ form }: VoucherProviderStepProps) => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold">Where does this voucher run?</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Choose the provider — this determines which discount types are available.
        </p>
      </div>

      <Controller
        name="provider"
        control={form.control}
        render={({ field }) => (
          <div className="grid grid-cols-1 gap-2">
            {PROVIDER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  field.onChange(option.value);
                  // Reset discount kind when switching provider
                  const caps =
                    option.value === "square"
                      ? ["percentage", "fixed_amount"]
                      : ["percentage", "fixed_amount", "free_item", "bogof", "custom"];
                  const currentKind = form.getValues("discount.kind");
                  if (!caps.includes(currentKind)) {
                    form.setValue("discount.kind", option.value === "square" ? "percentage" : "percentage");
                    form.setValue("discount.value", undefined);
                    form.setValue("discount.itemName", undefined);
                    form.setValue("discount.customText", undefined);
                  }
                }}
                className={cn(
                  "flex items-center justify-between px-4 py-3 border text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  field.value === option.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/50",
                )}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  className={cn(
                    "text-xs max-w-[60%] text-right",
                    field.value === option.value
                      ? "text-background/70"
                      : "text-muted-foreground",
                  )}
                >
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        )}
      />
    </div>
  );
};
