import { useState } from "react";
import { Controller, type Control } from "react-hook-form";
import { ChevronDownIcon } from "lucide-react";
import {
  Field,
  FieldLabel,
  FieldError,
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@repo/ui";
import type { VoucherFormValues } from "~/schemas/voucher-form-schema";

interface DateFieldProps {
  control: Control<VoucherFormValues>;
  name: "voucherValidFrom" | "voucherValidTo";
  id: string;
  label: string;
}

export const DateField = ({ control, name, id, label }: DateFieldProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field className="flex-1" data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id={id}
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
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
};
