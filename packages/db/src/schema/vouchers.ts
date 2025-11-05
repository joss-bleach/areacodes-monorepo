import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  pgPolicy,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authenticatedRole } from "drizzle-orm/supabase";

import { timestamps } from "./helpers";
import { businesses } from "./businesses";

export const voucherFormatEnum = pgEnum("voucher_type", [
  "barcode",
  "qr_code",
  "generated_text",
]);

export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").references(() => businesses.id),
    clerkUserId: text("clerk_user_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    voucherFormat: voucherFormatEnum("voucher_format").notNull(),
    voucherImgUrl: text("voucher_img_url"),
    voucherGenCode: text("voucher_gen_code"),
    voucherTerms: text("voucher_terms"),
    voucherValidFrom: timestamp("voucher_valid_from").notNull(),
    voucherValidTo: timestamp("voucher_valid_to").notNull(),
    ...timestamps,
  },
  (table) => [
    // Indexes for frequently queried columns
    index("vouchers_business_id_idx").on(table.businessId),
    index("vouchers_clerk_user_id_idx").on(table.clerkUserId),
    // Composite index for date range queries (businessId + date ranges)
    // This optimizes queries like getActiveVouchersByBusinessSlug and getBusinessesWithVouchers
    index("vouchers_business_dates_idx").on(
      table.businessId,
      table.voucherValidFrom,
      table.voucherValidTo
    ),
    // Index for expiring vouchers query (voucherValidTo used in range queries)
    index("vouchers_valid_to_idx").on(table.voucherValidTo),
    // Everyone can view vouchers
    pgPolicy("vouchers_select_policy", {
      for: "select",
      to: "public",
      using: sql`true`,
    }),
    // Only authenticated users can create vouchers
    pgPolicy("vouchers_insert_policy", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.jwt() ->> 'sub' IS NOT NULL`,
    }),
    // Only authenticated users who created the voucher can update
    pgPolicy("vouchers_update_policy", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.jwt() ->> 'sub' = clerk_user_id`,
    }),
    // Only authenticated users who created the voucher can delete
    pgPolicy("vouchers_delete_policy", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.jwt() ->> 'sub' = clerk_user_id`,
    }),
  ]
);
