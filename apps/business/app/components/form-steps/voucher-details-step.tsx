import { useEffect } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import {
  Input,
  Textarea,
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@repo/ui";
import { deriveVoucherCopy } from "@areacodes/domain";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";
import { toMinorUnits } from "~/lib/discount-units";
import { DateField } from "./date-field";

interface VoucherDetailsStepProps {
  form: UseFormReturn<VoucherFormValues>;
}

export const VoucherDetailsStep = ({ form }: VoucherDetailsStepProps) => {
  const discount = form.watch("discount");

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold">Details & validity window</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Title and description are auto-filled — you can edit them.
        </p>
      </div>

      <FieldGroup>
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="voucher-title">Title</FieldLabel>
              <Input
                {...field}
                id="voucher-title"
                placeholder="Enter voucher title…"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

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
      </FieldGroup>

      <div className="flex flex-col sm:flex-row gap-4">
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

      <Controller
        name="voucherTerms"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="voucher-terms">
              Terms & Conditions{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </FieldLabel>
            <Textarea
              {...field}
              id="voucher-terms"
              placeholder="Enter any terms and conditions…"
              aria-invalid={fieldState.invalid}
              rows={3}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  );
};
