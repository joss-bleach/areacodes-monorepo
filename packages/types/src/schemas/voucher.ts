import { z } from "zod";

export const createVoucherSchema = z
  .object({
    businessId: z.string().min(1),
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    voucherFormat: z.enum(["barcode", "qr_code", "generated_text"]),
    voucherStorageId: z.string().optional(),
    voucherGenCode: z.string().optional(),
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
    voucherFormat: z.enum(["barcode", "qr_code", "generated_text"]),
    voucherStorageId: z.string().optional(),
    voucherGenCode: z.string().optional(),
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
