import { z } from "zod";

const discountSchema = z.object({
  kind: z.enum(["percentage", "fixed_amount", "free_item", "bogof", "custom"]),
  value: z.number().optional(),
  currency: z.string().optional(),
  itemName: z.string().optional(),
  customText: z.string().optional(),
});

export const voucherFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    discount: discountSchema,
    voucherTerms: z.string().optional(),
    voucherValidFrom: z.date(),
    voucherValidTo: z.date(),
  })
  .refine((data) => data.voucherValidTo >= data.voucherValidFrom, {
    message: "End date must be after start date",
    path: ["voucherValidTo"],
  })
  .refine(
    (data) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return data.voucherValidTo >= now;
    },
    {
      message: "End date cannot be in the past",
      path: ["voucherValidTo"],
    }
  );

export type VoucherFormValues = z.infer<typeof voucherFormSchema>;
