import { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  Input,
  Textarea,
  Skeleton,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Button,
  cn,
} from "@repo/ui";
import type { CreateBusinessProfileFormValues } from "~/schemas/create-business-profile-schema";
import { BoundaryAlert } from "~/components/boundary-alert";

type FormValues = CreateBusinessProfileFormValues;

export const BusinessInformationStep = ({
  form,
}: {
  form: UseFormReturn<FormValues>;
}) => {
  const industries = useQuery(api.functions.industries.getAllIndustries, {});

  if (industries === undefined) {
    return <BusinessInformationStepLoading />;
  }

  if (!industries) {
    return (
      <BoundaryAlert
        title="Error loading form"
        description="Error loading form. Please try again later."
      />
    );
  }

  const industriesByCategory = industries.reduce(
    (acc, industry) => {
      if (!acc[industry.category]) {
        acc[industry.category] = [];
      }
      acc[industry.category].push(industry);
      return acc;
    },
    {} as Record<string, typeof industries>
  );

  return (
    <div className="w-full flex flex-col space-y-6">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="create-business-form-name">
                Business name
              </FieldLabel>
              <Input
                {...field}
                id="create-business-form-name"
                className="w-full"
                placeholder="Enter your business name…"
                aria-invalid={fieldState.invalid}
                autoComplete="organization"
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
              <FieldLabel htmlFor="create-business-form-description">
                Business description
              </FieldLabel>
              <Textarea
                {...field}
                id="create-business-form-description"
                className="w-full"
                placeholder="Tell us a bit about your business…"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="industryId"
          control={form.control}
          render={({ field, fieldState }) => (
            <IndustryCombobox
              value={field.value}
              onChange={field.onChange}
              industries={industries}
              industriesByCategory={industriesByCategory}
              invalid={fieldState.invalid}
              error={fieldState.error}
            />
          )}
        />

        <Controller
          name="websiteUrl"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="create-business-form-websiteUrl">
                Website URL
              </FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id="create-business-form-websiteUrl"
                className="w-full"
                placeholder="Enter your business website URL…"
                type="url"
                aria-invalid={fieldState.invalid}
                autoComplete="url"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
    </div>
  );
};

const IndustryCombobox = ({
  value,
  onChange,
  industries,
  industriesByCategory,
  invalid,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  industries: { _id: string; name: string; category: string }[];
  industriesByCategory: Record<
    string,
    { _id: string; name: string; category: string }[]
  >;
  invalid: boolean;
  error: any;
}) => {
  const [open, setOpen] = useState(false);

  const selectedName =
    industries.find((i) => i._id === value)?.name ?? null;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor="create-business-form-industryId">
        Industry
      </FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="create-business-form-industryId"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            className={cn(
              "w-full justify-between font-normal h-9",
              !selectedName && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedName ?? "Select an industry…"}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Search industries…" />
            <CommandList>
              <CommandEmpty>No industries found.</CommandEmpty>
              {Object.entries(industriesByCategory).map(
                ([category, items]) => (
                  <CommandGroup key={category} heading={category}>
                    {items.map((industry) => (
                      <CommandItem
                        key={industry._id}
                        value={industry.name}
                        onSelect={() => {
                          onChange(industry._id);
                          setOpen(false);
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === industry._id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {industry.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {invalid && <FieldError errors={[error]} />}
    </Field>
  );
};

const BusinessInformationStepLoading = () => {
  return (
    <div className="w-full flex flex-col space-y-6">
      <div className="flex flex-col gap-2 w-full">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
};
