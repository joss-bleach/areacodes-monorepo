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
  getVoucherById,
  updateVoucher,
  deleteVoucher,
} from "db";
import { slugify } from "@/lib/utils";
import { z } from "zod";
import { createBusinessProfileInputSchema } from "@/modules/business/schemas/create-business-profile-schema";
import {
  createVoucherSchema,
  updateVoucherSchema,
} from "@/modules/business/schemas/create-voucher-schema";
import { getVouchersByBusinessSlug } from "db";
import { extractFilePathFromUrl, deleteFileServer } from "@/lib/storage";

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
  getVoucherById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const voucher = await getVoucherById(input.id);
      if (!voucher) {
        throw new Error("Voucher not found");
      }
      if (voucher.clerkUserId !== ctx.auth) {
        throw new Error("Unauthorized: You do not own this voucher");
      }
      return voucher;
    }),
  updateVoucher: protectedProcedure
    .input(updateVoucherSchema)
    .mutation(async ({ ctx, input }) => {
      const voucher = await getVoucherById(input.id);
      if (!voucher) {
        throw new Error("Voucher not found");
      }
      if (voucher.clerkUserId !== ctx.auth) {
        throw new Error("Unauthorized: You do not own this voucher");
      }

      const business = await getBusinessBySlug(input.businessSlug);
      if (!business) {
        throw new Error("Business not found");
      }
      if (business.clerkUserId !== ctx.auth) {
        throw new Error("Unauthorized: You do not own this business");
      }

      // Handle image deletion if image URL changed
      if (
        voucher.voucherImgUrl &&
        voucher.voucherImgUrl !== input.voucherImgUrl
      ) {
        const filePath = extractFilePathFromUrl(
          voucher.voucherImgUrl,
          "vouchers"
        );
        if (filePath) {
          // Double-check that we're only deleting voucher images
          // Voucher images should be in the images/ folder
          if (filePath.startsWith("images/")) {
            try {
              // Call deleteFileServer directly since we're already on the server
              const deleteResult = await deleteFileServer("vouchers", filePath);
              if (!deleteResult.success) {
                console.error(
                  "Failed to delete old image:",
                  deleteResult.error,
                  "Path:",
                  filePath,
                  "URL:",
                  voucher.voucherImgUrl
                );
              } else {
                console.log("Successfully deleted old image:", filePath);
              }
            } catch (error) {
              console.error("Error deleting old image:", error);
              // Continue with update even if image deletion fails
            }
          } else {
            console.warn(
              `Skipping deletion of file with unexpected path: ${filePath}`
            );
          }
        } else {
          console.warn(
            `Could not extract file path from URL: ${voucher.voucherImgUrl}`
          );
        }
      }

      const updated = await updateVoucher({
        id: input.id,
        businessId: business.id,
        clerkUserId: ctx.auth,
        title: input.title,
        description: input.description,
        voucherFormat: input.voucherFormat,
        voucherImgUrl: input.voucherImgUrl || null,
        voucherGenCode: input.voucherGenCode || null,
        voucherTerms: input.voucherTerms || null,
        voucherValidFrom: input.voucherValidFrom,
        voucherValidTo: input.voucherValidTo,
        createdAt: voucher.createdAt,
        updatedAt: new Date(),
        deletedAt: voucher.deletedAt,
      });
      return updated;
    }),
  deleteVoucher: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const voucher = await getVoucherById(input.id);
      if (!voucher) {
        throw new Error("Voucher not found");
      }
      if (voucher.clerkUserId !== ctx.auth) {
        throw new Error("Unauthorized: You do not own this voucher");
      }

      // Delete associated image if it exists
      if (voucher.voucherImgUrl) {
        const filePath = extractFilePathFromUrl(
          voucher.voucherImgUrl,
          "vouchers"
        );
        if (filePath) {
          // Double-check that we're only deleting voucher images
          // Voucher images should be in the images/ folder
          if (filePath.startsWith("images/")) {
            try {
              // Call deleteFileServer directly since we're already on the server
              const deleteResult = await deleteFileServer("vouchers", filePath);
              if (!deleteResult.success) {
                console.error(
                  "Failed to delete image:",
                  deleteResult.error,
                  "Path:",
                  filePath,
                  "URL:",
                  voucher.voucherImgUrl
                );
              } else {
                console.log("Successfully deleted image:", filePath);
              }
            } catch (error) {
              console.error("Error deleting image:", error);
              // Continue with voucher deletion even if image deletion fails
            }
          } else {
            console.warn(
              `Skipping deletion of file with unexpected path: ${filePath}`
            );
          }
        } else {
          console.warn(
            `Could not extract file path from URL: ${voucher.voucherImgUrl}`
          );
        }
      }

      await deleteVoucher(input.id);
      return { success: true };
    }),
});
