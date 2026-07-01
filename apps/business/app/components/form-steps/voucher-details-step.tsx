import { useEffect, useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { ChevronDownIcon } from "lucide-react";
import {
  Input,
  Textarea,
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@repo/ui";
import { deriveVoucherCopy } from "@areacodes/domain";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";
import type { Discount } from "@areacodes/domain";

interface VoucherDetailsStepProps {
  form: UseFormReturn<VoucherFormValues>;
}

function toMinorUnits(discount: VoucherFormValues["discount"]): Discount {
  if (discount.kind === "fixed_amount" && discount.value != null) {
    return {
      ...discount,
      value: Math.round(discount.value * 100),
      currency: discount.currency ?? "GBP",
    };
  }
  return discount;
}

export const VoucherDetailsStep = ({ form }: VoucherDetailsStepProps) => {
  const discount = form.watch("discount");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

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
        <Controller
          name="voucherValidFrom"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="flex-1" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="voucher-valid-from">Valid from</FieldLabel>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="voucher-valid-from"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-between font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    aria-invalid={fieldState.invalid}
                  >
                    <span className="truncate">
                      {field.value ? field.value.toLocaleDateString() : "Select date"}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start" sideOffset={4}>
                  <Calendar
                    mode="single"
                    selected={field.value}
                    captionLayout="dropdown"
                    fromDate={new Date()}
                    fromYear={new Date().getFullYear()}
                    toYear={new Date().getFullYear() + 10}
                    onSelect={(date) => {
                      field.onChange(date);
                      setStartDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="voucherValidTo"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="flex-1" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="voucher-valid-to">Valid to</FieldLabel>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="voucher-valid-to"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-between font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    aria-invalid={fieldState.invalid}
                  >
                    <span className="truncate">
                      {field.value ? field.value.toLocaleDateString() : "Select date"}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start" sideOffset={4}>
                  <Calendar
                    mode="single"
                    selected={field.value}
                    captionLayout="dropdown"
                    fromDate={new Date()}
                    fromYear={new Date().getFullYear()}
                    toYear={new Date().getFullYear() + 10}
                    onSelect={(date) => {
                      field.onChange(date);
                      setEndDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
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
