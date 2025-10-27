import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getBusinessByClerkUserId } from "db";

export const businessRouter = createTRPCRouter({
  getBusinessByClerkUserId: baseProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const businesses = await getBusinessByClerkUserId(input);
      return businesses;
    }),
});
