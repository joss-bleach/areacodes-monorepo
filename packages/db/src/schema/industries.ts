import { pgTable, text, uuid, pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "./helpers";

export const industries = pgTable(
  "industries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    slug: text("slug").notNull().unique(),
    ...timestamps,
  },
  (table) => [
    // Everyone can view industries
    pgPolicy("industries_select_policy", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
  ]
);
