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
