import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getAllIndustries, getBusinessByClerkUserId } from "db";

export const businessRouter = createTRPCRouter({
  getAllIndustries: baseProcedure.query(async () => {
    const industries = await getAllIndustries();
    return industries;
  }),
  getBusinessByClerkUserId: baseProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const businesses = await getBusinessByClerkUserId(input);
      return businesses;
    }),
});
