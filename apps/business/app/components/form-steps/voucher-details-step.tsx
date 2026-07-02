import { useEffect } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { Info } from "lucide-react";
import {
  Input,
  Textarea,
  Field,
  FieldLabel,
  FieldError,
} from "@repo/ui";
import { deriveVoucherCopy } from "@areacodes/domain";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";
import { toMinorUnits } from "~/lib/discount-units";
import { MetaChip } from "~/components/voucher-wizard/meta-chip";
import { DateField } from "./date-field";

interface VoucherDetailsStepProps {
  form: UseFormReturn<VoucherFormValues>;
}

const DISCOUNT_VALUE_SUFFIX: Record<VoucherFormValues["discount"]["kind"], string | null> = {
  percentage: "%",
  fixed_amount: "£",
  free_item: null,
  bogof: null,
  custom: null,
};

export const VoucherDetailsStep = ({ form }: VoucherDetailsStepProps) => {
  const discount = useWatch({ control: form.control, name: "discount" });

  // Auto-derive title/description when discount changes, unless user has manually edited them
  useEffect(() => {
    const copy = deriveVoucherCopy(toMinorUnits(discount));
    if (!form.getFieldState("title").isDirty) {
      form.setValue("title", copy.title, { shouldDirty: false });
    }
    if (!form.getFieldState("description").isDirty) {
      form.setValue("description", copy.description, { shouldDirty: false });
    }
  }, [discount.kind, discount.value, discount.itemName, discount.customText]);

  const valueSuffix = DISCOUNT_VALUE_SUFFIX[discount.kind];

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-4.5 border border-border bg-card p-8">
        <div className="flex gap-4">
          {valueSuffix && (
            <Controller
              name="discount.value"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="w-[150px] shrink-0">
                  <FieldLabel htmlFor="discount-value">Discount value</FieldLabel>
                  <div className="relative">
                    <Input
                      id="discount-value"
                      type="number"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? undefined : Number(val));
                      }}
                      className="pr-7"
                      aria-invalid={fieldState.invalid}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-muted-foreground">
                      {valueSuffix}
                    </span>
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}

          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="grow">
                <FieldLabel htmlFor="voucher-title">Voucher title</FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id="voucher-title"
                    placeholder="Enter voucher title…"
                    className="pr-14"
                    aria-invalid={fieldState.invalid}
                  />
                  {!form.getFieldState("title").isDirty && (
                    <MetaChip
                      tone="neutral"
                      size="sm"
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      Auto
                    </MetaChip>
                  )}
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="voucher-description">Description</FieldLabel>
              <Textarea
                {...field}
                id="voucher-description"
                placeholder="Enter voucher description…"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="voucherTerms"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="voucher-terms">Terms &amp; conditions (optional)</FieldLabel>
              <Input
                {...field}
                id="voucher-terms"
                placeholder="e.g. One per customer. Dine-in only."
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex gap-4">
          <DateField
            control={form.control}
            name="voucherValidFrom"
            id="voucher-valid-from"
            label="Valid from"
          />
          <DateField
            control={form.control}
            name="voucherValidTo"
            id="voucher-valid-to"
            label="Valid to"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Info className="size-[13px] shrink-0 text-muted-foreground" strokeWidth={2} />
        <p className="text-[11px] leading-[150%] text-muted-foreground">
          Title and description are filled from your discount. Edit either to override.
        </p>
      </div>
    </div>
  );
};
