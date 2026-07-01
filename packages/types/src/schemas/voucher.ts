import { z } from "zod";

const discountSchema = z.object({
  kind: z.enum(["percentage", "fixed_amount", "free_item", "bogof", "custom"]),
  value: z.number().optional(),
  currency: z.string().optional(),
  itemName: z.string().optional(),
  customText: z.string().optional(),
});

export const createVoucherSchema = z
  .object({
    businessId: z.string().min(1),
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    provider: z.enum(["square", "manual"]),
    discount: discountSchema,
    voucherTerms: z.string().optional(),
    voucherValidFrom: z.number(),
    voucherValidTo: z.number(),
  })
  .refine((data) => data.voucherValidTo >= data.voucherValidFrom, {
    message: "End date must be after start date",
    path: ["voucherValidTo"],
  })
  .refine(
    (data) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return data.voucherValidTo >= now.getTime();
    },
    {
      message: "End date cannot be in the past",
      path: ["voucherValidTo"],
    }
  );

export const updateVoucherSchema = z
  .object({
    voucherId: z.string().min(1),
    businessId: z.string().min(1),
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    discount: discountSchema,
    voucherTerms: z.string().optional(),
    voucherValidFrom: z.number(),
    voucherValidTo: z.number(),
  })
  .refine((data) => data.voucherValidTo >= data.voucherValidFrom, {
    message: "End date must be after start date",
    path: ["voucherValidTo"],
  });

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;
