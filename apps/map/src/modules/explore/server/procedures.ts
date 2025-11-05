import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getBusinessesWithVouchers } from "db";

export const exploreRouter = createTRPCRouter({
  getBusinessesWithVouchers: baseProcedure.query(async () => {
    const businesses = await getBusinessesWithVouchers();
    return businesses;
  }),
});

