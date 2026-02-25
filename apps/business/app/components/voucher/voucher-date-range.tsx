import { useState } from "react";
import { Controller, type Control } from "react-hook-form";
import { ChevronDownIcon } from "lucide-react";
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Field,
  FieldLabel,
  FieldError,
  cn,
} from "@repo/ui";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";

interface VoucherDateRangeProps {
  control: Control<VoucherFormValues>;
}

export const VoucherDateRange = ({ control }: VoucherDateRangeProps) => {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Controller
        name="voucherValidFrom"
        control={control}
        render={({ field, fieldState }) => (
          <Field className="flex-1" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="start-date">Start date</FieldLabel>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="start-date"
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-between font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                  aria-invalid={fieldState.invalid}
                >
                  <span className="truncate">
                    {field.value
                      ? field.value.toLocaleDateString()
                      : "Select date"}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="start"
                sideOffset={4}
              >
                <Calendar
                  mode="single"
                  selected={field.value}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    field.onChange(date);
                    setStartDateOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />

      <Controller
        name="voucherValidTo"
        control={control}
        render={({ field, fieldState }) => (
          <Field className="flex-1" data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="end-date">End date</FieldLabel>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="end-date"
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-between font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                  aria-invalid={fieldState.invalid}
                >
                  <span className="truncate">
                    {field.value
                      ? field.value.toLocaleDateString()
                      : "Select date"}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="start"
                sideOffset={4}
              >
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
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />
    </div>
  );
};
