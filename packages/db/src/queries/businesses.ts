import { eq } from "drizzle-orm";
import { db } from "../database";

import { businesses } from "../schema";

import { Business } from "../types";

export async function getBusinessByClerkUserId(
  clerkUserId: string
): Promise<Business[] | undefined> {
  return await db
    .select()
    .from(businesses)
    .where(eq(businesses.clerkUserId, clerkUserId));
}
