import { baseProcedure, createTRPCRouter } from "../init";
import { getAllIndustries } from "db";
import { exploreRouter } from "@/modules/explore/server/procedures";
import { voucherRouter } from "@/modules/voucher/server/procedures";

export const appRouter = createTRPCRouter({
  getIndustries: baseProcedure.query(async () => {
    const industries = await getAllIndustries();
    return industries;
  }),
  explore: exploreRouter,
  voucher: voucherRouter,
});

export type AppRouter = typeof appRouter;
