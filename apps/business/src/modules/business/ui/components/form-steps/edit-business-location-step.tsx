"use client";

import { Controller, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { counties } from "@/modules/business/constants/counties";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { updateBusinessProfileFormSchema } from "@/modules/business/schemas/update-business-profile-schema";
import { LocationPicker } from "@/components/map/location-picker";

type FormValues = z.infer<typeof updateBusinessProfileFormSchema>;

export const EditBusinessLocationStep = ({
  form,
}: {
  form: UseFormReturn<FormValues>;
}) => {
  const latitude = form.watch("latitude");
  const longitude = form.watch("longitude");

  // Only show map if we have valid coordinates
  const hasCoordinates =
    latitude != null &&
    longitude != null &&
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  const handleLocationChange = (lat: number, lng: number) => {
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      {hasCoordinates && (
        <div className="w-full">
          <FieldLabel>Business location on map</FieldLabel>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
            className="mt-2"
          />
        </div>
      )}

      <FieldGroup className="gap-4">
        <Controller
          name="addressLine1"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="edit-business-form-addressLine1">
                Address line 1
              </FieldLabel>
              <Input
                {...field}
                id="edit-business-form-addressLine1"
                className="w-full"
                aria-invalid={fieldState.invalid}
                autoComplete="address-line1"
                onChange={(e) => {
                  field.onChange(e);
                  // Clear coordinates when address changes manually
                  form.setValue("latitude", undefined);
                  form.setValue("longitude", undefined);
                }}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="addressLine2"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="edit-business-form-addressLine2">
                Address line 2
              </FieldLabel>
              <Input
                {...field}
                id="edit-business-form-addressLine2"
                className="w-full"
                autoComplete="address-line2"
                onChange={(e) => {
                  field.onChange(e);
                  // Clear coordinates when address changes manually
                  form.setValue("latitude", undefined);
                  form.setValue("longitude", undefined);
                }}
              />
            </Field>
          )}
        />

        <Controller
          name="townOrCity"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="edit-business-form-townOrCity">
                Town or city
              </FieldLabel>
              <Input
                {...field}
                id="edit-business-form-townOrCity"
                className="w-full"
                aria-invalid={fieldState.invalid}
                autoComplete="address-level2"
                onChange={(e) => {
                  field.onChange(e);
                  // Clear coordinates when address changes manually
                  form.setValue("latitude", undefined);
                  form.setValue("longitude", undefined);
                }}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex flex-col md:flex-row items-center gap-2 w-full">
          <Controller
            name="county"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="w-full">
                <FieldLabel htmlFor="edit-business-form-county">
                  County
                </FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    // Clear coordinates when address changes manually
                    form.setValue("latitude", undefined);
                    form.setValue("longitude", undefined);
                  }}
                  name={field.name}
                >
                  <SelectTrigger
                    id="edit-business-form-county"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Select a county" />
                  </SelectTrigger>
                  <SelectContent side="bottom">
                    {counties.map((county: string) => (
                      <SelectItem key={county} value={county}>
                        {county}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="postcode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="w-full">
                <FieldLabel htmlFor="edit-business-form-postcode">
                  Post code
                </FieldLabel>
                <Input
                  {...field}
                  id="edit-business-form-postcode"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                  autoComplete="postal-code"
                  onChange={(e) => {
                    field.onChange(e);
                    // Clear coordinates when address changes manually
                    form.setValue("latitude", undefined);
                    form.setValue("longitude", undefined);
                  }}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
      </FieldGroup>
    </div>
  );
};

