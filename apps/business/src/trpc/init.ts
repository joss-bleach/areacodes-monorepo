import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { auth } from "@clerk/nextjs/server";

export const createTRPCContext = cache(async () => {
  return { userId: "user_123" };
});

const t = initTRPC.create({
  transformer: superjson,
});
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const { userId } = await auth();
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      auth: userId,
    },
  });
});
