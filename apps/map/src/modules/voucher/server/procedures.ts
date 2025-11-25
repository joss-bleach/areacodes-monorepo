import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getVoucherByIdWithBusiness } from "db";

export const voucherRouter = createTRPCRouter({
  getVoucherById: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await getVoucherByIdWithBusiness(input.id);
      if (!result) {
        throw new Error("Voucher not found");
      }
      return result;
    }),
});

