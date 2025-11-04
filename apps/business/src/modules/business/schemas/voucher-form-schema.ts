import { z } from "zod";

export const voucherFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    voucherFormat: z.enum(["qr-code", "barcode", "generated-text"]),
    voucherGenCode: z.string().optional(),
    voucherTerms: z.string().optional(),
    voucherValidFrom: z.date({
      required_error: "Start date is required",
    }),
    voucherValidTo: z.date({
      required_error: "End date is required",
    }),
  })
  .refine(
    (data) => data.voucherValidTo >= data.voucherValidFrom,
    {
      message: "End date must be after start date",
      path: ["voucherValidTo"],
    }
  )
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
