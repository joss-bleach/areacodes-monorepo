import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import {
  createBusiness,
  getAllIndustries,
  getBusinessByClerkUserId,
  getBusinessBySlug,
} from "db";
import { slugify } from "@/lib/utils";
import { z } from "zod";
import { createBusinessProfileInputSchema } from "@/modules/business/schemas/create-business-profile-schema";

export const businessRouter = createTRPCRouter({
  getAllIndustries: baseProcedure.query(async () => {
    const industries = await getAllIndustries();
    return industries;
  }),
  getBusinessByClerkUserId: protectedProcedure.query(async ({ ctx }) => {
    const businesses = await getBusinessByClerkUserId(ctx.auth);
    return businesses;
  }),
  create: protectedProcedure
    .input(createBusinessProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const business = await createBusiness({
        clerkUserId: ctx.auth,
        name: input.name,
        slug: slugify(input.name),
        description: input.description,
        websiteUrl: input.websiteUrl,
        industryId: input.industryId,
        address: input.address,
        longitude: input.longitude,
        latitude: input.latitude,
        logoUrl: input.logoUrl,
      });
      return business;
    }),
  getBusinessBySlug: baseProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const business = await getBusinessBySlug(input.slug);
      return business;
    }),
});
