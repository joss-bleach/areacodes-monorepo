import { eq, gte, and, lte, sql } from "drizzle-orm";
import { db } from "../database";

import { businesses } from "../schema";
import { vouchers } from "../schema/vouchers";

import { Business, NewBusiness, Voucher } from "../types";

export async function getBusinessByClerkUserId(
  clerkUserId: string
): Promise<Business[] | undefined> {
  return await db
    .select()
    .from(businesses)
    .where(eq(businesses.clerkUserId, clerkUserId));
}

export async function createBusiness(business: NewBusiness): Promise<Business> {
  const [inserted] = await db.insert(businesses).values(business).returning();
  return inserted;
}

export async function getBusinessBySlug(
  slug: string
): Promise<Business | undefined> {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);
  return business as Business | undefined;
}

export async function getBusinessIdBySlug(
  slug: string
): Promise<string | undefined> {
  const [business] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1);
  return business?.id as string | undefined;
}

export async function deleteBusiness(id: string): Promise<void> {
  await db.delete(businesses).where(eq(businesses.id, id));
}

export async function updateBusiness(business: Business): Promise<Business> {
  const [updated] = await db
    .update(businesses)
    .set(business)
    .where(eq(businesses.id, business.id))
    .returning();
  return updated;
}

export type BusinessWithVoucher = {
  voucher: Voucher;
  business: Business;
};

export async function getBusinessesWithVouchers(): Promise<BusinessWithVoucher[]> {
  const now = new Date();
  
  // Get active vouchers with their business information
  const result = await db
    .select({
      voucher: {
        id: vouchers.id,
        businessId: vouchers.businessId,
        clerkUserId: vouchers.clerkUserId,
        title: vouchers.title,
        description: vouchers.description,
        voucherFormat: vouchers.voucherFormat,
        voucherImgUrl: vouchers.voucherImgUrl,
        voucherGenCode: vouchers.voucherGenCode,
        voucherTerms: vouchers.voucherTerms,
        voucherValidFrom: vouchers.voucherValidFrom,
        voucherValidTo: vouchers.voucherValidTo,
        createdAt: vouchers.createdAt,
        updatedAt: vouchers.updatedAt,
        deletedAt: vouchers.deletedAt,
      },
      business: {
        id: businesses.id,
        clerkUserId: businesses.clerkUserId,
        name: businesses.name,
        slug: businesses.slug,
        description: businesses.description,
        websiteUrl: businesses.websiteUrl,
        logoUrl: businesses.logoUrl,
        industryId: businesses.industryId,
        address: businesses.address,
        latitude: businesses.latitude,
        longitude: businesses.longitude,
        createdAt: businesses.createdAt,
        updatedAt: businesses.updatedAt,
        deletedAt: businesses.deletedAt,
      },
    })
    .from(vouchers)
    .innerJoin(businesses, eq(vouchers.businessId, businesses.id))
    .where(
      and(
        lte(vouchers.voucherValidFrom, now),
        gte(vouchers.voucherValidTo, now)
      )
    );

  return result as BusinessWithVoucher[];
}
