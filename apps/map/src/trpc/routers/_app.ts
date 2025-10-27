import { baseProcedure, createTRPCRouter } from "../init";
import { getAllIndustries } from "db";

export const appRouter = createTRPCRouter({
  getIndustries: baseProcedure.query(async () => {
    const industries = await getAllIndustries();
    return industries;
  }),
});

export type AppRouter = typeof appRouter;
