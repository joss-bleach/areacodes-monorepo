import { Controller, type Control } from "react-hook-form";
import { RadioGroup, RadioGroupItem, Field, FieldLabel, cn } from "@repo/ui";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";

interface VoucherFormatPickerProps {
  control: Control<VoucherFormValues>;
}

export const VoucherFormatPicker = ({
  control,
}: VoucherFormatPickerProps) => {
  return (
    <Controller
      name="voucherFormat"
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel>Voucher type</FieldLabel>
          <RadioGroup
            value={field.value}
            onValueChange={field.onChange}
            className="flex flex-col sm:flex-row gap-0 border border-border"
          >
            <label
              htmlFor="qr-code"
              className={cn(
                "flex flex-1 items-center justify-center gap-2 border-b sm:border-b-0 sm:border-r border-border px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors",
                field.value === "qr-code"
                  ? "bg-muted"
                  : "bg-background hover:bg-muted/50"
              )}
            >
              <RadioGroupItem value="qr-code" id="qr-code" />
              <span className="text-sm font-medium whitespace-nowrap">
                QR Code
              </span>
            </label>
            <label
              htmlFor="barcode"
              className={cn(
                "flex flex-1 items-center justify-center gap-2 border-b sm:border-b-0 sm:border-r border-border px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors",
                field.value === "barcode"
                  ? "bg-muted"
                  : "bg-background hover:bg-muted/50"
              )}
            >
              <RadioGroupItem value="barcode" id="barcode" />
              <span className="text-sm font-medium whitespace-nowrap">
                Barcode
              </span>
            </label>
            <label
              htmlFor="generated-text"
              className={cn(
                "flex flex-1 items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors",
                field.value === "generated-text"
                  ? "bg-muted"
                  : "bg-background hover:bg-muted/50"
              )}
            >
              <RadioGroupItem value="generated-text" id="generated-text" />
              <span className="text-sm font-medium whitespace-nowrap">
                Text
              </span>
            </label>
          </RadioGroup>
        </Field>
      )}
    />
  );
};
