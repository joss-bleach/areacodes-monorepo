import { pgTable, real, text, uuid, pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole } from "drizzle-orm/supabase";

import { timestamps } from "./helpers";
import { industries } from "./industries";

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    websiteUrl: text("website_url").notNull(),
    logoUrl: text("logo_url").notNull(),
    industryId: uuid("industry_id").references(() => industries.id),
    address: text("address").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    ...timestamps,
  },
  (table) => [
    // Everyone can view businesses
    pgPolicy("businesses_select_policy", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    // Only authenticated users can create businesses
    pgPolicy("businesses_insert_policy", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.jwt() ->> 'sub' IS NOT NULL`,
    }),
    // Only authenticated users who created the business can update
    pgPolicy("businesses_update_policy", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.jwt() ->> 'sub' = clerk_user_id`,
    }),
    // Only authenticated users who created the business can delete
    pgPolicy("businesses_delete_policy", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.jwt() ->> 'sub' = clerk_user_id`,
    }),
  ]
);
