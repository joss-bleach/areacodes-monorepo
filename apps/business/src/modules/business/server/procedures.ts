import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import {
  createBusiness,
  createVoucher,
  getAllIndustries,
  getBusinessByClerkUserId,
  getBusinessBySlug,
  getActiveVouchersByBusinessSlug,
  getExpiringVouchersByBusinessSlug,
} from "db";
import { slugify } from "@/lib/utils";
import { z } from "zod";
import { createBusinessProfileInputSchema } from "@/modules/business/schemas/create-business-profile-schema";
import { createVoucherSchema } from "@/modules/business/schemas/create-voucher-schema";
import { getVouchersByBusinessSlug } from "db";

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
  getBusinessBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const business = await getBusinessBySlug(input.slug);
      return business;
    }),
  getVouchersByBusinessSlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const vouchers = await getVouchersByBusinessSlug(input.slug);
      return vouchers;
    }),
  getActiveVouchersByBusinessSlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const vouchers = await getActiveVouchersByBusinessSlug(input.slug);
      return vouchers;
    }),
  getExpiringVouchersByBusinessSlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const vouchers = await getExpiringVouchersByBusinessSlug(input.slug);
      return vouchers;
    }),
  createVoucher: protectedProcedure
    .input(createVoucherSchema)
    .mutation(async ({ ctx, input }) => {
      const business = await getBusinessBySlug(input.businessSlug);
      if (!business) {
        throw new Error("Business not found");
      }
      if (business.clerkUserId !== ctx.auth) {
        throw new Error("Unauthorized: You do not own this business");
      }
      const voucher = await createVoucher({
        businessId: business.id,
        clerkUserId: ctx.auth,
        title: input.title,
        description: input.description,
        voucherFormat: input.voucherFormat,
        voucherImgUrl: input.voucherImgUrl,
        voucherGenCode: input.voucherGenCode,
        voucherTerms: input.voucherTerms,
        voucherValidFrom: input.voucherValidFrom,
        voucherValidTo: input.voucherValidTo,
      });
      return voucher;
    }),
});
