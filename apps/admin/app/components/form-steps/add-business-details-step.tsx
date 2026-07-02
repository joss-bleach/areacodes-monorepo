import { Controller, type UseFormReturn } from "react-hook-form";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  Input,
  Skeleton,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import type { AddBusinessFormValues } from "~/schemas/add-business-form-schema";

export const AddBusinessDetailsStep = ({
  form,
}: {
  form: UseFormReturn<AddBusinessFormValues>;
}) => {
  const { isAuthenticated } = useConvexAuth();
  const industries = useQuery(
    api.functions.industries.getAllIndustries,
    isAuthenticated ? {} : "skip",
  );

  return (
    <div className="w-full flex flex-col space-y-6">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="add-business-name">Business name</FieldLabel>
              <Input
                {...field}
                id="add-business-name"
                className="w-full rounded-none"
                placeholder="The Anchor"
                aria-invalid={fieldState.invalid}
                autoComplete="organization"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="ownerEmail"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="add-business-owner-email">Owner email</FieldLabel>
              <Input
                {...field}
                id="add-business-owner-email"
                type="email"
                className="w-full rounded-none"
                placeholder="owner@business.com"
                aria-invalid={fieldState.invalid}
                autoComplete="email"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              <p className="text-xs text-muted-foreground">
                The owner will receive a sign-in invitation at this address.
              </p>
            </Field>
          )}
        />

        <Controller
          name="industryId"
          control={form.control}
          render={({ field, fieldState }) =>
            industries === undefined ? (
              <div className="flex flex-col gap-2 w-full">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="add-business-industry">Industry</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange} name={field.name}>
                  <SelectTrigger id="add-business-industry" className="w-full rounded-none" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {(industries ?? []).map((ind) => (
                      <SelectItem key={ind._id} value={ind._id}>
                        {ind.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )
          }
        />
      </FieldGroup>
    </div>
  );
};
