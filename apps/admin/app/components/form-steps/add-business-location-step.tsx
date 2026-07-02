import { useState, useRef, useEffect } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { CheckCircle, Loader2 } from "lucide-react";
import { Input, Field, FieldError, FieldGroup, FieldLabel } from "@repo/ui";
import type { AddBusinessFormValues } from "~/schemas/add-business-form-schema";

interface LocationSuggestion {
  place_id: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    county?: string;
    postcode?: string;
  };
  lat?: number;
  lon?: number;
}

const composeAddress = (values: {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
}) =>
  [values.addressLine1, values.addressLine2, values.city, values.postcode]
    .filter(Boolean)
    .join(", ");

export const AddBusinessLocationStep = ({
  form,
}: {
  form: UseFormReturn<AddBusinessFormValues>;
}) => {
  const [query, setQuery] = useState(form.getValues("address") || "");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latitude = form.watch("latitude");
  const longitude = form.watch("longitude");
  const resolved = latitude != null && longitude != null;

  const fetchSuggestions = async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "autocomplete", q: input }),
      });
      const data = await res.json();
      if (res.ok) setSuggestions(data);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResolved = () => {
    form.setValue("latitude", undefined as unknown as number);
    form.setValue("longitude", undefined as unknown as number);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    form.setValue("address", value);
    clearResolved();
    setShowSuggestions(true);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelect = async (suggestion: LocationSuggestion) => {
    setSuggestions([]);
    setShowSuggestions(false);
    setQuery(suggestion.display_name);
    setIsLoadingDetails(true);
    try {
      const res = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "details", placeId: suggestion.place_id }),
      });
      if (!res.ok) return;
      const details: LocationSuggestion = await res.json();
      if (details.lat == null || details.lon == null) return;

      const addressLine1 = [details.address?.house_number, details.address?.road]
        .filter(Boolean)
        .join(" ");
      const city = details.address?.city ?? "";
      const county = details.address?.county ?? "";
      const postcode = details.address?.postcode ?? "";

      form.setValue("addressLine1", addressLine1);
      form.setValue("city", city);
      form.setValue("county", county);
      form.setValue("postcode", postcode);
      form.setValue("address", details.display_name);
      setQuery(details.display_name);
      form.setValue("latitude", Number(details.lat));
      form.setValue("longitude", Number(details.lon));
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]!);
    }
    if (e.key === "Escape") setShowSuggestions(false);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const syncAddress = () => {
    const values = form.getValues();
    form.setValue(
      "address",
      composeAddress({
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        city: values.city,
        postcode: values.postcode,
      }),
    );
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      <Controller
        name="address"
        control={form.control}
        render={({ fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="add-business-address">Business address</FieldLabel>
            <div className="relative">
              <Input
                id="add-business-address"
                value={query}
                className="w-full rounded-none"
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Start typing an address…"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {(isLoading || isLoadingDetails) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border shadow-md overflow-hidden">
                  <div className="max-h-52 overflow-y-auto p-1">
                    {suggestions.map((s, i) => (
                      <div
                        key={s.place_id}
                        className={`flex cursor-pointer select-none items-center px-2 py-1.5 text-sm transition-colors ${
                          selectedIndex === i
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        }`}
                        onMouseDown={() => handleSelect(s)}
                        onMouseEnter={() => setSelectedIndex(i)}
                      >
                        <span className="truncate">{s.display_name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t px-2 py-1.5 text-xs text-muted-foreground text-right">
                    Powered by Google
                  </div>
                </div>
              )}
            </div>
            {resolved ? (
              <p className="text-xs text-foreground mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Address found
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select an address from the suggestions.
              </p>
            )}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {resolved && (
        <div className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Controller
              name="addressLine1"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="add-business-addressLine1">Address</FieldLabel>
                  <Input
                    {...field}
                    id="add-business-addressLine1"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                    autoComplete="address-line1"
                    onChange={(e) => {
                      field.onChange(e);
                      syncAddress();
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
                  <FieldLabel htmlFor="add-business-addressLine2">Address line 2</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="add-business-addressLine2"
                    className="w-full"
                    autoComplete="address-line2"
                    onChange={(e) => {
                      field.onChange(e);
                      syncAddress();
                    }}
                  />
                </Field>
              )}
            />

            <Controller
              name="city"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="add-business-city">City</FieldLabel>
                  <Input
                    {...field}
                    id="add-business-city"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                    autoComplete="address-level2"
                    onChange={(e) => {
                      field.onChange(e);
                      syncAddress();
                    }}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <div className="flex flex-col gap-4 sm:flex-row">
              <Controller
                name="county"
                control={form.control}
                render={({ field }) => (
                  <Field className="w-full">
                    <FieldLabel htmlFor="add-business-county">County</FieldLabel>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id="add-business-county"
                      className="w-full"
                      autoComplete="address-level1"
                    />
                  </Field>
                )}
              />

              <Controller
                name="postcode"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="w-full">
                    <FieldLabel htmlFor="add-business-postcode">Postcode</FieldLabel>
                    <Input
                      {...field}
                      id="add-business-postcode"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                      autoComplete="postal-code"
                      onChange={(e) => {
                        field.onChange(e);
                        syncAddress();
                      }}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </div>
      )}
    </div>
  );
};
