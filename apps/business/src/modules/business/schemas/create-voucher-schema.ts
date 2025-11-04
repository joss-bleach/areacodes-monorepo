import { z } from "zod";

export const createVoucherSchema = z
  .object({
    businessSlug: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    voucherFormat: z.enum(["barcode", "qr_code", "generated_text"]),
    voucherGenCode: z.string().optional(),
    voucherTerms: z.string().optional(),
    voucherImgUrl: z.string().url().optional(),
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
