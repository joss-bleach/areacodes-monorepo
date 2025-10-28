"use client";

import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { counties } from "@/modules/business/constants/counties";

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
}

export const BusinessLocationStep = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: input }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("API Response received:", data);
        setSuggestions(data);
        setError("");
        console.log("Suggestions set:", data);
      } else {
        setError(data.error || "Failed to fetch suggestions");
        setSuggestions([]);
      }
    } catch (err) {
      setError("Failed to fetch location suggestions");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    setSelectedIndex(-1); // Reset selection when typing

    // Clear existing timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set new timeout for debouncing
    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    setQuery(suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    setError("");
    setSelectedIndex(-1);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
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
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Debug logging for state changes
  useEffect(() => {
    console.log("Component state:", {
      suggestions: suggestions.length,
      showSuggestions,
      isLoading,
      error,
      query,
    });
  }, [suggestions, showSuggestions, isLoading, error, query]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col space-y-6">
      <div className="flex flex-col gap-2 w-full relative">
        <Label htmlFor="address-autocomplete">Start typing your address</Label>
        <div className="relative">
          <Input
            ref={inputRef}
            id="address-autocomplete"
            className="w-full"
            value={query}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="Enter your business address"
          />

          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
            </div>
          )}

          {/* Error message */}
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-none shadow-md max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
                Select an address from the suggestions below:
              </div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.place_id}
                  className={`px-2 py-1.5 cursor-pointer border-b border-border last:border-b-0 transition-colors duration-150 ${
                    selectedIndex === index
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {suggestion.display_name}
                      </div>
                      {suggestion.address && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[
                            suggestion.address.house_number,
                            suggestion.address.road,
                            suggestion.address.city,
                            suggestion.address.county,
                            suggestion.address.postcode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-t border-border">
                Can't find your address? Use the manual entry option below.
              </div>
            </div>
          )}
        </div>
      </div>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="manual">
          <AccordionTrigger className="text-muted-foreground">
            Enter manually
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
            <div className="flex flex-col gap-2 w-full">
              <Label htmlFor="address-line-1">Address line 2</Label>
              <Input id="address-line-1" className="w-full" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Label htmlFor="address-line-2">Address line 2</Label>
              <Input id="address-line-2" className="w-full" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Label htmlFor="town-or-city">Town or city</Label>
              <Input id="town-or-city" className="w-full" />
            </div>
            <div className="flex flex-row items-center gap-2 w-full">
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="county">County</Label>
                <Select>
                  <SelectTrigger className="w-full">
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
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="address-line-2">Post code</Label>
                <Input id="address-line-2" className="w-full" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
