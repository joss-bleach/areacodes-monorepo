import { eq } from "drizzle-orm";
import { db } from "../database";

import { businesses } from "../schema";

import { Business, NewBusiness } from "../types";

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
