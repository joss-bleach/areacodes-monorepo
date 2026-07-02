import { z } from "zod";

export const addBusinessFormSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  ownerEmail: z.string().min(1, "Owner email is required").email("Enter a valid email"),
  industryId: z.string().min(1, "Please select an industry"),
  address: z.string().min(1, "Select an address from the suggestions"),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  county: z.string().optional(),
  postcode: z.string().min(1, "Postcode is required"),
  latitude: z.number({ error: "Select an address from the suggestions" }),
  longitude: z.number({ error: "Select an address from the suggestions" }),
  description: z.string().optional(),
  websiteUrl: z
    .union([z.literal(""), z.string().url("Please enter a valid website URL")])
    .optional(),
  logoUrl: z.string().optional(),
});

export type AddBusinessFormValues = z.infer<typeof addBusinessFormSchema>;
