import { describe, expect, test } from "vitest";
import {
  createBusinessFormSchema,
  createBusinessInputSchema,
  updateBusinessInputSchema,
} from "../business";

const validFormData = {
  name: "Brighton Beans",
  description: "A cosy coffee shop in the North Laine",
  websiteUrl: "https://brightonbeans.co.uk",
  industryId: "abc123",
  addressLine1: "1 Bond Street",
  townOrCity: "Brighton",
  county: "East Sussex",
  postcode: "BN1 1BD",
  latitude: 50.82,
  longitude: -0.14,
};

describe("createBusinessFormSchema", () => {
  test("accepts valid data", () => {
    const result = createBusinessFormSchema.safeParse(validFormData);
    expect(result.success).toBe(true);
  });

  test("accepts optional addressLine2", () => {
    const result = createBusinessFormSchema.safeParse({
      ...validFormData,
      addressLine2: "Flat 2",
    });
    expect(result.success).toBe(true);
  });

  test("accepts empty websiteUrl", () => {
    const result = createBusinessFormSchema.safeParse({
      ...validFormData,
      websiteUrl: "",
    });
    expect(result.success).toBe(true);
  });

  test("accepts omitted websiteUrl", () => {
    const { websiteUrl: _, ...rest } = validFormData;
    const result = createBusinessFormSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  test("rejects invalid URL", () => {
    const result = createBusinessFormSchema.safeParse({
      ...validFormData,
      websiteUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing name", () => {
    const result = createBusinessFormSchema.safeParse({
      ...validFormData,
      name: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "Business name is required")
      ).toBe(true);
    }
  });

  test("rejects missing description", () => {
    const result = createBusinessFormSchema.safeParse({
      ...validFormData,
      description: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes("Business description is required")
        )
      ).toBe(true);
    }
  });

  test("rejects missing industryId", () => {
    const result = createBusinessFormSchema.safeParse({
      ...validFormData,
      industryId: "",
    });
    expect(result.success).toBe(false);
  });

  describe("UK postcode validation", () => {
    const validPostcodes = [
      "BN1 1BD",
      "BN11BD",
      "SW1A 1AA",
      "EC1A 1BB",
      "W1A 0AX",
      "GIR 0AA",
      "bn1 1bd", // lowercase
    ];

    const invalidPostcodes = [
      "INVALID",
      "12345",
      "NOTAPC",
      "ZZ1 1ZZ",
    ];

    validPostcodes.forEach((postcode) => {
      test(`accepts "${postcode}"`, () => {
        const result = createBusinessFormSchema.safeParse({
          ...validFormData,
          postcode,
        });
        expect(result.success).toBe(true);
      });
    });

    invalidPostcodes.forEach((postcode) => {
      test(`rejects "${postcode}"`, () => {
        const result = createBusinessFormSchema.safeParse({
          ...validFormData,
          postcode,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(
            result.error.issues.some((i) => i.message === "Invalid UK postcode")
          ).toBe(true);
        }
      });
    });

    test("trims whitespace before validation", () => {
      const result = createBusinessFormSchema.safeParse({
        ...validFormData,
        postcode: "  BN1 1BD  ",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("createBusinessInputSchema", () => {
  const validInput = {
    name: "Brighton Beans",
    description: "A cosy coffee shop",
    websiteUrl: "https://example.com",
    industryId: "abc123",
    address: "1 Bond Street, Brighton, BN1 1BD",
    latitude: 50.82,
    longitude: -0.14,
  };

  test("accepts valid input", () => {
    expect(createBusinessInputSchema.safeParse(validInput).success).toBe(true);
  });

  test("transforms missing websiteUrl to empty string", () => {
    const { websiteUrl: _, ...rest } = validInput;
    const result = createBusinessInputSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.websiteUrl).toBe("");
    }
  });
});

describe("updateBusinessInputSchema", () => {
  test("requires businessId", () => {
    const result = updateBusinessInputSchema.safeParse({
      name: "Test",
      description: "Test",
      industryId: "abc",
      address: "Test",
      latitude: 0,
      longitude: 0,
    });
    expect(result.success).toBe(false);
  });
});
