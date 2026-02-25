import { useState, useRef, useEffect } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui";
import { counties } from "~/constants/counties";
import type { BusinessProfileFormValues } from "~/schemas/business-profile-schema";

type FormValues = BusinessProfileFormValues;

interface LocationSuggestion {
  place_id: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
  };
  lat?: number;
  lon?: number;
}

export const BusinessLocationStep = ({
  form,
  idPrefix = "business-form",
  searchLabel = "Start typing your address",
  searchPlaceholder = "Enter your business address…",
}: {
  form: UseFormReturn<FormValues>;
  idPrefix?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [addressSearch, setAddressSearch] = useState("");
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setError("");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: input }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuggestions(data);
        setError("");
      } else {
        setError(data.error || "Failed to fetch suggestions");
        setSuggestions([]);
      }
    } catch {
      setError("Failed to fetch location suggestions");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setAddressSearch(value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    setSuggestions([]);
    setShowSuggestions(false);
    setError("");
    setSelectedIndex(-1);

    const line1Parts = [
      suggestion.address?.house_number,
      suggestion.address?.road,
    ].filter(Boolean);
    const line1 = line1Parts.join(" ");
    const town = suggestion.address?.city || "";
    const postcode = suggestion.address?.postcode || "";
    const rawCounty = suggestion.address?.county || "";
    const matchedCounty =
      counties.find((c) => c.toLowerCase() === rawCounty.toLowerCase()) ||
      rawCounty;

    setAddressSearch(suggestion.display_name || "");
    form.setValue("addressLine1", line1);
    form.setValue("townOrCity", town);
    form.setValue("postcode", postcode);
    form.setValue("county", matchedCounty);
    if (suggestion.lat != null) form.setValue("latitude", Number(suggestion.lat));
    if (suggestion.lon != null) form.setValue("longitude", Number(suggestion.lon));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]!);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, []);

  const clearCoordinates = () => {
    form.setValue("latitude", undefined);
    form.setValue("longitude", undefined);
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      <div className="flex flex-col gap-2 w-full relative">
        <FieldLabel htmlFor={`${idPrefix}-address-search`}>
          {searchLabel}
        </FieldLabel>
        <div className="relative">
          <Input
            id={`${idPrefix}-address-search`}
            value={addressSearch}
            className="w-full"
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            autoComplete="off"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground" />
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive mt-1">{error}</p>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border shadow-md overflow-hidden">
              <div className="max-h-60 overflow-y-auto p-1">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.place_id}
                    className={`relative flex cursor-default select-none items-center px-2 py-1.5 text-sm outline-none transition-colors ${
                      selectedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    }`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className="truncate">
                      {suggestion.display_name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                Can't find your address? Enter it manually below.
              </div>
            </div>
          )}
        </div>
      </div>

      <FieldGroup className="gap-4">
        <Controller
          name="addressLine1"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${idPrefix}-addressLine1`}>
                Address line 1
              </FieldLabel>
              <Input
                {...field}
                id={`${idPrefix}-addressLine1`}
                className="w-full"
                aria-invalid={fieldState.invalid}
                autoComplete="address-line1"
                onChange={(e) => {
                  field.onChange(e);
                  clearCoordinates();
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
              <FieldLabel htmlFor={`${idPrefix}-addressLine2`}>
                Address line 2
              </FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id={`${idPrefix}-addressLine2`}
                className="w-full"
                autoComplete="address-line2"
                onChange={(e) => {
                  field.onChange(e);
                  clearCoordinates();
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
              <FieldLabel htmlFor={`${idPrefix}-townOrCity`}>
                Town or city
              </FieldLabel>
              <Input
                {...field}
                id={`${idPrefix}-townOrCity`}
                className="w-full"
                aria-invalid={fieldState.invalid}
                autoComplete="address-level2"
                onChange={(e) => {
                  field.onChange(e);
                  clearCoordinates();
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
                <FieldLabel htmlFor={`${idPrefix}-county`}>
                  County
                </FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    clearCoordinates();
                  }}
                  name={field.name}
                >
                  <SelectTrigger
                    id={`${idPrefix}-county`}
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Select a county…" />
                  </SelectTrigger>
                  <SelectContent side="bottom">
                    {counties.map((county) => (
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
                <FieldLabel htmlFor={`${idPrefix}-postcode`}>
                  Post code
                </FieldLabel>
                <Input
                  {...field}
                  id={`${idPrefix}-postcode`}
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                  autoComplete="postal-code"
                  onChange={(e) => {
                    field.onChange(e);
                    clearCoordinates();
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
