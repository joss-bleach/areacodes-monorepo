import { Controller, type Control } from "react-hook-form";
import {
  Input,
  Textarea,
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@repo/ui";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";

interface VoucherFormFieldsProps {
  control: Control<VoucherFormValues>;
}

export const VoucherFormFields = ({ control }: VoucherFormFieldsProps) => {
  return (
    <FieldGroup>
      <Controller
        name="title"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="voucher-title">Title</FieldLabel>
            <Input
              {...field}
              id="voucher-title"
              placeholder="Enter voucher title…"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />

      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="voucher-description">Description</FieldLabel>
            <Textarea
              {...field}
              id="voucher-description"
              placeholder="Enter voucher description…"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />

      <Controller
        name="voucherTerms"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="voucher-terms">
              Terms & Conditions
            </FieldLabel>
            <Textarea
              {...field}
              id="voucher-terms"
              placeholder="Enter voucher terms and conditions (optional)…"
              aria-invalid={fieldState.invalid}
              rows={4}
            />
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />
    </FieldGroup>
  );
};
