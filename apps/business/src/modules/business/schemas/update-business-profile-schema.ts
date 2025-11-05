import { z } from "zod";

const UK_POSTCODE_REGEX =
  /^(GIR\s?0AA|(?:(?:[A-PR-UWYZ][0-9][0-9]?)|(?:[A-PR-UWYZ][A-HK-Y][0-9][0-9]?)|(?:[A-PR-UWYZ][0-9][A-HJKSTUW])|(?:[A-PR-UWYZ][A-HK-Y][0-9][ABEHMNPRV-Y]))\s?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

export const updateBusinessProfileFormSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  description: z.string().min(1, "Business description is required"),
  websiteUrl: z
    .union([z.literal(""), z.url("Please enter a valid website URL")])
    .optional(),
  industryId: z.string().min(1, "Please select an industry"),
  // Manual address fields only
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  townOrCity: z.string().min(1, "Town or city is required"),
  county: z.string().min(1, "County is required"),
  postcode: z
    .string()
    .min(1, "Postcode is required")
    .transform((s) => s.trim())
    .refine((v) => UK_POSTCODE_REGEX.test(v), {
      message: "Invalid UK postcode",
    }),
  // Logo comes from the image upload step
  logoUrl: z.string().optional(),
  // Coordinates (not validated, just stored)
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Schema for tRPC input (slug identifies the business)
export const updateBusinessProfileInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  websiteUrl: z
    .string()
    .optional()
    .transform((v) => v ?? ""),
  industryId: z.string().min(1),
  address: z.string().min(1),
  longitude: z.number(),
  latitude: z.number(),
  logoUrl: z.string().min(1),
});

