import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { Check, Gift, PenLine, Info } from "lucide-react";
import { Input, Field, FieldError, FieldLabel, cn } from "@repo/ui";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";
import { getCapabilities } from "@areacodes/domain";
import { MetaChip } from "~/components/voucher-wizard/meta-chip";

type DiscountKind = VoucherFormValues["discount"]["kind"];

interface KindOption {
  value: DiscountKind;
  label: string;
  hint: string;
  symbol: React.ReactNode;
}

const KIND_OPTIONS: KindOption[] = [
  {
    value: "percentage",
    label: "Percentage",
    hint: "e.g. 20% off the order",
    symbol: <span className="font-mono text-[22px] font-bold leading-7 text-foreground">%</span>,
  },
  {
    value: "fixed_amount",
    label: "Fixed amount",
    hint: "e.g. £5 off the order",
    symbol: <span className="font-mono text-[22px] font-bold leading-7 text-foreground">£</span>,
  },
  {
    value: "free_item",
    label: "Free item",
    hint: "e.g. free flat white",
    symbol: <Gift className="size-[22px] text-muted-foreground" strokeWidth={2} />,
  },
  {
    value: "bogof",
    label: "Buy one get one",
    hint: "e.g. 2 pastries for 1",
    symbol: (
      <span className="font-mono text-xl font-bold leading-6 text-muted-foreground">2·1</span>
    ),
  },
  {
    value: "custom",
    label: "Custom offer",
    hint: "describe it yourself",
    symbol: <PenLine className="size-[22px] text-muted-foreground" strokeWidth={2} />,
  },
];

interface VoucherDiscountKindStepProps {
  form: UseFormReturn<VoucherFormValues>;
}

export const VoucherDiscountKindStep = ({ form }: VoucherDiscountKindStepProps) => {
  const provider = useWatch({ control: form.control, name: "provider" });
  const caps = getCapabilities(provider);
  const selectedKind = useWatch({ control: form.control, name: "discount.kind" });
  const anyDisabled = KIND_OPTIONS.some((o) => !caps.provisionableKinds.includes(o.value));

  return (
    <div className="flex w-full flex-col gap-6">
      <Controller
        name="discount.kind"
        control={form.control}
        render={({ field }) => (
          <div className="flex flex-wrap gap-4">
            {KIND_OPTIONS.map((option) => {
              const available = caps.provisionableKinds.includes(option.value);
              const selected = field.value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!available}
                  onClick={() => {
                    if (field.value === option.value) return;
                    field.onChange(option.value);
                    form.setValue("discount.value", undefined);
                    form.setValue("discount.itemName", undefined);
                    form.setValue("discount.customText", undefined);
                  }}
                  className={cn(
                    "flex w-[229px] shrink-0 flex-col gap-3 border bg-card p-[18px] text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !available && "opacity-50",
                    available && selected
                      ? "border-foreground"
                      : "border-border",
                    available && !selected && "hover:border-foreground/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    {option.symbol}
                    {available ? (
                      <div
                        className={cn(
                          "flex size-4.5 shrink-0 items-center justify-center border",
                          selected ? "border-foreground bg-foreground" : "border-border",
                        )}
                      >
                        {selected && (
                          <Check className="size-2.5" strokeWidth={3.5} color="#000000" />
                        )}
                      </div>
                    ) : (
                      <MetaChip tone="neutral" size="sm">
                        Manual only
                      </MetaChip>
                    )}
                  </div>
                  <span className="text-sm font-bold leading-4.5 tracking-[-0.02em] text-foreground">
                    {option.label}
                  </span>
                  <p className="text-[11px] leading-[150%] text-muted-foreground">{option.hint}</p>
                </button>
              );
            })}
          </div>
        )}
      />

      {anyDisabled && (
        <div className="flex items-center gap-2">
          <Info className="size-[13px] shrink-0 text-muted-foreground" strokeWidth={2} />
          <p className="text-[11px] leading-[150%] text-muted-foreground">
            Free item, BOGOF and custom offers are applied by staff — switch this voucher to the
            Manual path to use them.
          </p>
        </div>
      )}

      <KindSpecificInput form={form} kind={selectedKind} />
    </div>
  );
};

const KindSpecificInput = ({
  form,
  kind,
}: {
  form: UseFormReturn<VoucherFormValues>;
  kind: DiscountKind;
}) => {
  if (kind === "bogof") return null;

  if (kind === "percentage") {
    return (
      <Controller
        name="discount.value"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="max-w-[229px]">
            <FieldLabel htmlFor="discount-pct">Percentage</FieldLabel>
            <div className="relative">
              <Input
                id="discount-pct"
                type="number"
                min={1}
                max={100}
                placeholder="e.g. 20"
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? undefined : Number(val));
                }}
                className="pr-8"
                aria-invalid={fieldState.invalid}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                %
              </span>
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    );
  }

  if (kind === "fixed_amount") {
    return (
      <Controller
        name="discount.value"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="max-w-[229px]">
            <FieldLabel htmlFor="discount-amount">Amount (£)</FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                £
              </span>
              <Input
                id="discount-amount"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="e.g. 5.00"
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? undefined : Number(val));
                }}
                className="pl-7"
                aria-invalid={fieldState.invalid}
              />
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    );
  }

  if (kind === "free_item") {
    return (
      <Controller
        name="discount.itemName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="max-w-[229px]">
            <FieldLabel htmlFor="discount-item">Item name</FieldLabel>
            <Input
              id="discount-item"
              placeholder="e.g. flat white"
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value || undefined)}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    );
  }

  if (kind === "custom") {
    return (
      <Controller
        name="discount.customText"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="max-w-[320px]">
            <FieldLabel htmlFor="discount-custom">Offer description</FieldLabel>
            <Input
              id="discount-custom"
              placeholder="e.g. Staff discount — 15% off"
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value || undefined)}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    );
  }

  return null;
};
