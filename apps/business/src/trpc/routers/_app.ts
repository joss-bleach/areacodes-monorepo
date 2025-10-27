import { baseProcedure, createTRPCRouter } from "../init";
import { businessRouter } from "@/modules/business/server/procedures";

export const appRouter = createTRPCRouter({
  business: businessRouter,
});

export type AppRouter = typeof appRouter;
