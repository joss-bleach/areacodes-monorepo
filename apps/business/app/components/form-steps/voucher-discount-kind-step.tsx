import { Controller, type UseFormReturn } from "react-hook-form";
import { Input, Field, FieldError, FieldLabel, cn } from "@repo/ui";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";
import { getCapabilities } from "@areacodes/domain";

type DiscountKind = VoucherFormValues["discount"]["kind"];

interface KindOption {
  value: DiscountKind;
  label: string;
  hint: string;
}

const KIND_OPTIONS: KindOption[] = [
  { value: "percentage", label: "Percentage off", hint: "e.g. 20% off" },
  { value: "fixed_amount", label: "Fixed amount off", hint: "e.g. £5 off" },
  { value: "free_item", label: "Free item", hint: "e.g. Free flat white" },
  { value: "bogof", label: "Buy one, get one free", hint: "BOGOF" },
  { value: "custom", label: "Custom offer", hint: "Describe your own offer" },
];

interface VoucherDiscountKindStepProps {
  form: UseFormReturn<VoucherFormValues>;
}

export const VoucherDiscountKindStep = ({ form }: VoucherDiscountKindStepProps) => {
  const provider = form.watch("provider");
  const caps = getCapabilities(provider);
  const availableOptions = KIND_OPTIONS.filter((o) =>
    caps.provisionableKinds.includes(o.value)
  );

  const selectedKind = form.watch("discount.kind");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold">Discount type</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Choose the kind of offer you want to create.
        </p>
      </div>

      <Controller
        name="discount.kind"
        control={form.control}
        render={({ field }) => (
          <div className="grid grid-cols-1 gap-2">
            {availableOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  field.onChange(option.value);
                  // Clear kind-specific fields when switching
                  form.setValue("discount.value", undefined);
                  form.setValue("discount.itemName", undefined);
                  form.setValue("discount.customText", undefined);
                }}
                className={cn(
                  "flex items-center justify-between px-4 py-3 border text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  field.value === option.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/50"
                )}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  className={cn(
                    "text-xs",
                    field.value === option.value
                      ? "text-background/70"
                      : "text-muted-foreground"
                  )}
                >
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        )}
      />

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
          <Field data-invalid={fieldState.invalid}>
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
          <Field data-invalid={fieldState.invalid}>
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
          <Field data-invalid={fieldState.invalid}>
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
          <Field data-invalid={fieldState.invalid}>
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
