import { z } from "zod";

const UK_POSTCODE_REGEX =
  /^(GIR\s?0AA|(?:(?:[A-PR-UWYZ][0-9][0-9]?)|(?:[A-PR-UWYZ][A-HK-Y][0-9][0-9]?)|(?:[A-PR-UWYZ][0-9][A-HJKSTUW])|(?:[A-PR-UWYZ][A-HK-Y][0-9][ABEHMNPRV-Y]))\s?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

export const createBusinessFormSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  description: z.string().min(1, "Business description is required"),
  websiteUrl: z
    .union([z.literal(""), z.url("Please enter a valid website URL")])
    .optional(),
  industryId: z.string().min(1, "Please select an industry"),
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
  logoStorageId: z.string().optional(),
  addressSearch: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const createBusinessInputSchema = z.object({
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
  logoStorageId: z.string().optional(),
});

export const updateBusinessFormSchema = createBusinessFormSchema;

export const updateBusinessInputSchema = createBusinessInputSchema.extend({
  businessId: z.string().min(1),
});

export type CreateBusinessFormValues = z.infer<typeof createBusinessFormSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessInputSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessInputSchema>;
