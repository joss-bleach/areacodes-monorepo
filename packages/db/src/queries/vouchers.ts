import { eq, gte, and, lte } from "drizzle-orm";
import { db } from "../database";

import { businesses } from "../schema";
import { industries } from "../schema/industries";
import { vouchers } from "../schema/vouchers";
import { getBusinessIdBySlug, NewVoucher, Voucher, Business, Industry } from "..";

export async function getVouchersByBusinessSlug(
  slug: string
): Promise<Voucher[]> {
  const businessId = await getBusinessIdBySlug(slug);
  if (!businessId) {
    return [];
  }
  return await db
    .select()
    .from(vouchers)
    .where(eq(vouchers.businessId, businessId));
}

export async function createVoucher(voucher: NewVoucher): Promise<Voucher> {
  const [inserted] = await db.insert(vouchers).values(voucher).returning();
  return inserted;
}

export async function getVoucherById(id: string): Promise<Voucher | null> {
  const [voucher] = await db
    .select()
    .from(vouchers)
    .where(eq(vouchers.id, id))
    .limit(1);
  return voucher || null;
}

export type VoucherWithBusiness = {
  voucher: Voucher;
  business: Business;
  industry: Industry | null;
};

export async function getVoucherByIdWithBusiness(
  id: string
): Promise<VoucherWithBusiness | null> {
  const result = await db
    .select({
      voucher: vouchers,
      business: businesses,
      industry: industries,
    })
    .from(vouchers)
    .innerJoin(businesses, eq(vouchers.businessId, businesses.id))
    .leftJoin(industries, eq(businesses.industryId, industries.id))
    .where(eq(vouchers.id, id))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0] as VoucherWithBusiness;
}

export async function updateVoucher(voucher: Voucher): Promise<Voucher> {
  const [updated] = await db
    .update(vouchers)
    .set(voucher)
    .where(eq(vouchers.id, voucher.id))
    .returning();
  return updated;
}

export async function deleteVoucher(id: string): Promise<void> {
  await db.delete(vouchers).where(eq(vouchers.id, id));
}

export async function getActiveVouchersByBusinessSlug(
  slug: string
): Promise<Voucher[]> {
  const businessId = await getBusinessIdBySlug(slug);
  if (!businessId) {
    return [];
  }
  const now = new Date();
  return await db
    .select()
    .from(vouchers)
    .where(
      and(
        eq(vouchers.businessId, businessId),
        lte(vouchers.voucherValidFrom, now),
        gte(vouchers.voucherValidTo, now)
      )
    );
}

export async function getExpiringVouchersByBusinessSlug(
  slug: string
): Promise<Voucher[]> {
  const businessId = await getBusinessIdBySlug(slug);
  if (!businessId) {
    return [];
  }
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  return await db
    .select()
    .from(vouchers)
    .where(
      and(
        eq(vouchers.businessId, businessId),
        gte(vouchers.voucherValidTo, now),
        lte(vouchers.voucherValidTo, thirtyDaysFromNow)
      )
    );
}
