import { db } from "../database";

import { industries } from "../schema";

import { Industry } from "../types";

export async function getAllIndustries(): Promise<Industry[]> {
  return await db.select().from(industries).orderBy(industries.category);
}
