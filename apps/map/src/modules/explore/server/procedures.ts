import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getBusinessesWithVouchers } from "db";

export const exploreRouter = createTRPCRouter({
  getBusinessesWithVouchers: baseProcedure
    .input(
      z
        .object({
          industryId: z.string().uuid().optional(),
          // Future: distance: z.number().optional(), sortBy: z.string().optional(), etc.
        })
        .optional()
    )
    .query(async ({ input }) => {
      const businesses = await getBusinessesWithVouchers(input || {});
      return businesses;
    }),
});

