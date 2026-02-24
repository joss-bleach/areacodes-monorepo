import { Controller, type UseFormReturn } from "react-hook-form";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
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
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="create-business-form-industryId">
                Industry
              </FieldLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                name={field.name}
              >
                <SelectTrigger
                  id="create-business-form-industryId"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Select an industry…" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  {Object.entries(industriesByCategory).map(
                    ([category, items]) => (
                      <SelectGroup key={category}>
                        <SelectLabel>{category}</SelectLabel>
                        {items.map((industry) => (
                          <SelectItem
                            key={industry._id}
                            value={industry._id}
                          >
                            {industry.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )
                  )}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
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
