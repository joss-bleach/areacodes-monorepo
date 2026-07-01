import { z } from "zod";

const discountSchema = z
  .object({
    kind: z.enum(["percentage", "fixed_amount", "free_item", "bogof", "custom"]),
    value: z.number().optional(),
    currency: z.string().optional(),
    itemName: z.string().optional(),
    customText: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "percentage") {
      if (data.value == null || data.value < 1 || data.value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Percentage must be between 1 and 100",
          path: ["value"],
        });
      }
    }
    if (data.kind === "fixed_amount") {
      if (data.value == null || data.value <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount must be greater than 0",
          path: ["value"],
        });
      }
    }
    if (data.kind === "free_item") {
      if (!data.itemName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Item name is required",
          path: ["itemName"],
        });
      }
    }
    if (data.kind === "custom") {
      if (!data.customText?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Custom text is required",
          path: ["customText"],
        });
      }
    }
  });

export const voucherFormSchema = z
  .object({
    provider: z.enum(["square", "manual"]),
    discount: discountSchema,
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
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
